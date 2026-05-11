export const VALIDATION_RULES = {
  minUsernameLength: 4,
  minPasswordLength: 4,
  passwordRegex: /^(?=.*[0-9!@#$%^&*])(?=.{4,})/,
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

export function validateAuth(
  username: string,
  email: string,
  password: string,
  isSignUp: boolean
): string | null {
  if (isSignUp) {
    if (username.length < VALIDATION_RULES.minUsernameLength) {
      return `Username must be at least ${VALIDATION_RULES.minUsernameLength} characters.`;
    }
    const usernameCharacters = /^[a-zA-Z0-9.]+$/;
    if (!usernameCharacters.test(username)) {
      return 'Username must be alphanumeric, valid dots, no spaces.';
    }
    if (!VALIDATION_RULES.emailRegex.test(email)) {
      return 'Invalid email format.';
    }
  } else {
    if (!username) {
      return 'Username or Email is required.';
    }
  }

  if (password.length < VALIDATION_RULES.minPasswordLength) {
    return `Password must be at least ${VALIDATION_RULES.minPasswordLength} characters.`;
  }
  
  if (!VALIDATION_RULES.passwordRegex.test(password)) {
    return 'Password must contain at least one number or symbol.';
  }

  return null;
}
