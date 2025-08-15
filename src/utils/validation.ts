export const validateName = (name: string): string => {
  if (!name) {
    return "Name is required.";
  }
  if (name.trim().length < 2 || name.trim().length > 20) {
    return "Name must be at least 2 characters and no more than 20 characters.";
  }
  return "";
};

export const validateEmail = (email: string): string => {
  if (!email) {
    return "Email is required.";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please provide a valid email address.";
  }
  return "";
};

export const validatePassword = (password: string): string => {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  return "";
};

export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): string => {
  if (!confirmPassword) {
    return "Confirm password is required.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return "";
};
