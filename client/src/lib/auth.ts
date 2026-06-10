/**
 * Centralized Administrative Authentication Utility
 *
 * This utility manages administrator credentials and provides validation logic.
 * It prioritizes environment variables for security but provides fallbacks
 * for local development and standalone deployments.
 */

// Use Vite environment variables with secure fallbacks
export const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "password_placeholder";

/**
 * Validates provided credentials against administrative settings
 * @param username The username to validate
 * @param password The password to validate
 * @returns boolean indicating if credentials are valid
 */
export const validateAdmin = (username: string, password: string): boolean => {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
};

/**
 * Validates only the password (used in components where username is fixed)
 * @param password The password to validate
 * @returns boolean indicating if password is valid
 */
export const validateAdminPassword = (password: string): boolean => {
  return password === ADMIN_PASSWORD;
};
