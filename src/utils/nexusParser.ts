import { getConsolidatedCategory } from './categoryMapper';
import { getRelativeDate, extractDateFromText } from '@/lib/dateUtils';
import type { Account, Social } from '@/types';

/**
 * Advanced Nexus Parser
 * Handles: Math, Multi-entity splitting, and Date parsing
 */

interface ParsedNexusItem {
  id: string;
  type: 'TRANSACTION' | 'REMINDER';
  description?: string;
  title?: string;
  amount: number;
  transactionType: 'DEBIT' | 'CREDIT';
  accountId: string;
  category: string;
  date: string;
  reminderDate?: string;
  link?: string;
  isReminder: boolean;
  isLocal: boolean;
  createdAt: { seconds: number; nanoseconds: number };
  socialId?: string;
  socialTargetName?: string;
  socialType?: 'LENT' | 'BORROWED';
  outstandingBalance?: number;
  isNewSocialCandidate?: boolean;
}

/**
 * Strict Math Evaluator
 * Only handles +, -, *, /
 * Strict Hyphen Rule: - is only subtraction if digit before and after
 */
function evaluateMath(text: string): number {
  // Find all numbers and operators
  // Matches: 1000, 1500 / 3, 2000 - 500
  const mathRegex = /(\d+(\.\d+)?)\s*([\+\*\/]|(?<=\d)-(?=\d))\s*(\d+(\.\d+)?)/g;
  
  let resultMatch;
  let finalAmountString = text;

  // We loop to handle multiple operations if they exist
  // But for simple nexus uses, it's usually one operation: 1500 / 3
  while ((resultMatch = mathRegex.exec(text)) !== null) {
    const fullExpr = resultMatch[0];
    try {
      // Use Function instead of eval for safer evaluation of simple math
      const val = new Function(`return ${fullExpr}`)();
      finalAmountString = finalAmountString.replace(fullExpr, val.toString());
    } catch (e) {
      console.error('Math evaluation failed', e);
    }
  }

  // Extract the final single number
  const finalMatch = finalAmountString.match(/\d+(\.\d+)?/);
  return finalMatch ? parseFloat(finalMatch[0]) : 0;
}


/**
 * Splits input into segments, grouping dangling descriptions with their primary transaction
 */
function splitSegments(text: string): { text: string; subParts: string[] }[] {
  const rawSegments = text.split(/,|\band\b|&/gi);
  const groups: { text: string; subParts: string[] }[] = [];
  
  rawSegments.forEach(seg => {
    const trimmed = seg.trim();
    if (!trimmed) return;

    const hasNumber = /\d+/.test(trimmed);
    
    if (hasNumber || groups.length === 0) {
      groups.push({ text: trimmed, subParts: [] });
    } else {
      // Dangling description: Add as sub-part to previous group
      groups[groups.length - 1].subParts.push(trimmed);
    }
  });

  return groups;
}

export function parseNexusInput(text: string, accounts: Account[], socials: Social[]): ParsedNexusItem[] {
  const groups = splitSegments(text);
  const items: ParsedNexusItem[] = [];

  groups.forEach(group => {
    // Global Intent Fork
    const isReminderIntent = /\b(remind|schedule|task|notif)\b/i.test(group.text);

    // 1. Date Detection
    const relativeDate = getRelativeDate(group.text);
    const date = relativeDate ? relativeDate.toISOString() : new Date().toISOString();

    if (isReminderIntent) {
      // REMINDER MODE: MIRROR RULE
      // 1. Smart Detection: Alert vs Note
      const extractedDate = extractDateFromText(group.text);
      
      const words = group.text.toLowerCase().split(/\s+/);
      const timeContextRegex = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|yesterday|morning|afternoon|evening|night|week|month|year|\d+|am|pm)/i;

      const hasAlertKeyword = words.some((word, i) => {
        const keywords = ['on', 'by', 'at', 'before', 'next', 'this'];
        if (keywords.includes(word)) {
          const nextWord = words[i + 1];
          // Check if there's a next word and it matches time context
          return nextWord && timeContextRegex.test(nextWord);
        }
        return false;
      });

      // 2. Link Detection: Identify URLs (http://, https://, or www.)
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
      const urlMatch = group.text.match(urlRegex) || (group.subParts.join(' ').match(urlRegex));
      const extractedLink = urlMatch ? urlMatch[0] : undefined;
      
      // Strip trigger phrase but preserve everything else exactly (no math/amount extraction)
      let mirroredTitle = group.text
        .replace(/remind me to /i, '')
        .replace(/remind /i, '')
        .replace(/schedule /i, '')
        .replace(/task /i, '')
        .replace(urlRegex, '') // Remove extracted URL from title
        .trim();

      // Append sub-parts literally if they exist
      if (group.subParts.length > 0) {
        mirroredTitle += ' ' + group.subParts.join(' ').replace(urlRegex, '').trim();
      }

      // Cleanup dangling punctuation from title (e.g., from "pay bill https://link,")
      mirroredTitle = mirroredTitle.replace(/[.,\s]+$/, '');

      if (mirroredTitle) {
        mirroredTitle = mirroredTitle.charAt(0).toUpperCase() + mirroredTitle.slice(1);
      }

      items.push({
        id: crypto.randomUUID(),
        type: 'REMINDER',
        title: mirroredTitle || group.text,
        amount: 0,
        transactionType: 'DEBIT',
        accountId: 'account_main',
        category: 'Other',
        date,
        reminderDate: extractedDate ? extractedDate.toISOString() : (hasAlertKeyword ? new Date().toISOString() : undefined),
        link: extractedLink,
        isReminder: true,
        isLocal: true,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      });
      return;
    }

    // TRANSACTION MODE: GLOBAL SCANNER (THE SAFE PARSER)
    
    const rawText = group.text.trim();
    const subText = group.subParts.join(' ');
    const fullText = `${rawText} ${subText}`.toLowerCase();

    // 1. GLOBAL ACCOUNT SCAN (Precedence Gate)
    let accountId = 'account_main';
    let isNewSocialCandidate = false;
    const accountNames = accounts.map(a => a.name.toLowerCase());
    const accountBankNames = accounts.map(a => a.bankName?.toLowerCase()).filter(Boolean) as string[];

    // 2. Direct Object & Pivot Detection (Unified Entity Resolution)
    const actionKeywords = /\b(paid|spent|sent|received|got|gave|transfer)\b/i;
    const directObjectMatch = rawText.match(new RegExp(`${actionKeywords.source}\\s+([a-z]+)`, 'i'));
    const directCandidate = directObjectMatch ? directObjectMatch[2].trim().toLowerCase() : '';
    
    // Strict Non-greedy bounded patterns for pivots
    const forMatch = rawText.match(/\bfor\b\s+(.*?)(?=\s+(?:via|from|to|at|on|in|with)|$)/i);
    const atMatch = rawText.match(/\bat\b\s+(.*?)(?=\s+(?:via|from|to|for|on|in|with)|$)/i);
    
    // Unified Entity Resolution Loop (Handles Accounts AND Socials)
    const entityMatches = Array.from(rawText.matchAll(/\b(from|to|via)\b\s+(.*?)(?=\s+(?:via|from|to|for|at|on|in|with)|$)/gi));
    
    let potentialSocialTarget = '';
    let matchedAccount: Account | undefined;

    // Check direct object match first (e.g. "Paid Arnab")
    if (directCandidate) {
      const accMatch = accounts.find(a => {
        const name = a.name.toLowerCase();
        const firstWord = name.split(' ')[0];
        const bankName = a.bankName?.toLowerCase() || '';
        return directCandidate === name || directCandidate === firstWord || (bankName && directCandidate === bankName);
      });

      if (accMatch) {
        accountId = accMatch.id;
        matchedAccount = accMatch;
      } else {
        potentialSocialTarget = directCandidate;
      }
    }

    // Process pivots - pivots take priority over direct objects for accountId
    entityMatches.forEach(match => {
      const target = match[2].trim().toLowerCase();

      // Check for account match (Word Boundary Strict)
      const accMatch = accounts.find(a => {
        const name = a.name.toLowerCase();
        const firstWord = name.split(' ')[0];
        const bankName = a.bankName?.toLowerCase() || '';
        return target === name || target === firstWord || (bankName && target === bankName);
      });

      if (accMatch) {
        accountId = accMatch.id;
        matchedAccount = accMatch;
      } else if (!potentialSocialTarget) {
        potentialSocialTarget = target;
      }
    });

    // SCANNER FALLBACK: If no pivot or object-based account was found, perform global word-boundary scan
    if (!matchedAccount) {
      matchedAccount = accounts.find(a => {
        const name = a.name.toLowerCase();
        const firstWord = name.split(' ')[0];
        const bankName = a.bankName?.toLowerCase() || '';
        const fullTextRegex = new RegExp(`\\b(${name}|${firstWord}${bankName ? `|${bankName}` : ''})\\b`, 'i');
        return fullTextRegex.test(fullText);
      });
      if (matchedAccount) accountId = matchedAccount.id;
    }

    // 3. Description Anchor (For/At Pivot Assembly)
    let extractedDescription = '';
    if (forMatch && atMatch) {
      extractedDescription = `${forMatch[1].trim()} at ${atMatch[1].trim()}`;
    } else if (forMatch) {
      extractedDescription = forMatch[1].trim();
    } else if (atMatch) {
      extractedDescription = atMatch[1].trim();
    }

    // 5. Trace Log Step: Social Recognition (GATE 2)
    let socialId: string | undefined;
    let socialTargetName: string | undefined;
    let socialType: 'LENT' | 'BORROWED' | undefined;
    let outstandingBalance: number | undefined;

    // Suppress social gate ONLY if target matches an account or is a Stop-Word
    const SOCIAL_STOP_WORDS = ['kotak', 'savings', 'cash', 'main', 'account', 'salary', 'emergency', 'via', ...accountNames, ...accountBankNames];
    const isStopWord = potentialSocialTarget && SOCIAL_STOP_WORDS.includes(potentialSocialTarget);

    if (potentialSocialTarget && !isStopWord) {
      const match = socials.find(s => 
        s.personName.toLowerCase() === potentialSocialTarget ||
        s.personName.toLowerCase().includes(potentialSocialTarget) ||
        potentialSocialTarget.includes(s.personName.toLowerCase())
      );

      if (match) {
        socialId = match.id;
        socialTargetName = match.personName;
        socialType = match.type;
        outstandingBalance = match.totalAmount - match.amountSettled;
      } else {
        isNewSocialCandidate = true;
        socialTargetName = potentialSocialTarget.charAt(0).toUpperCase() + potentialSocialTarget.slice(1);
      }
    }

    // 6. Cleanup & Title Construction (Non-Destructive)
    const amount = evaluateMath(rawText);
    let type: 'DEBIT' | 'CREDIT' = 'DEBIT';
    if (fullText.match(/\b(received|income|got|earn|salary|bonus|interest|dividend|cashback|refund)\b/i)) {
      type = 'CREDIT';
    }

    const category = getConsolidatedCategory(fullText);

    // If description was found via pivot, use it. Otherwise, clean keywords manually.
    let finalDescription = extractedDescription;
    if (!finalDescription) {
      finalDescription = rawText
        .replace(/\d+(\.\d{1,2})?[\s\+\-\*\/]*\d*(\.\d{1,2})?/g, '') // Remove math
        .replace(/\b(paid|spent|received|income|got|took|sent|gave|transfer|earned)\b/gi, '')
        .replace(/\b(for|from|to|via|on|at|in)\b/gi, '')
        .trim();
    }

    // Keyword Stripper: Remove account names and trailing pivot junk
    if (matchedAccount) {
      const accName = matchedAccount.name.toLowerCase();
      const firstWord = accName.split(' ')[0];
      const bankName = matchedAccount.bankName?.toLowerCase() || '';
      // Remove account name, bankName and its preceding keyword
      const removalRegex = new RegExp(`\\b(from|to|via)?\\s*(${accName}|${firstWord}${bankName ? `|${bankName}` : ''})\\b`, 'gi');
      finalDescription = finalDescription.replace(removalRegex, '').trim();
    }
    
    if (finalDescription) {
      // Final Sanitizer: Remove any trailing keywords that might have leaked
      finalDescription = finalDescription
        .replace(/\b(for|from|to|via|on|at|in|with)\b\s*$/gi, '')
        .trim();
      
      if (finalDescription) {
        finalDescription = finalDescription.charAt(0).toUpperCase() + finalDescription.slice(1);
      }
    }

    if (amount > 0) {
      items.push({
        id: crypto.randomUUID(),
        type: 'TRANSACTION',
        description: finalDescription || 'Transaction',
        amount,
        transactionType: type,
        accountId,
        category,
        date,
        isReminder: false,
        isLocal: true,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        socialId,
        socialTargetName,
        socialType,
        outstandingBalance,
        isNewSocialCandidate
      });
    }
  });

  return items;
}
