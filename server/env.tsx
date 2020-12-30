import dotenv from "dotenv";

function validateEnvironmentVariableOrExit(env: string | undefined): string {
  if (env === undefined) {
    throw new Error("Undefined environment variable");
  }
  return env || "";
}

// The structure of environment variables that are returned by
// readEnvironmentVariables method.
interface EnvironmentVariable {
  PORT: string;
  NODE_ENV: string;
  SHOPIFY_API_SECRET_KEY: string;
  SHOPIFY_API_KEY: string;
  SCOPES: string;
}

// readEnvironmentVariables from process.env and validate the environment variables
export function readEnvironmentVariables(): EnvironmentVariable {
  // Read environment variables from `.env` file
  // https://www.npmjs.com/package/dotenv
  const result = dotenv.config();
  if (result.error) {
    throw result.error;
  }

  // All environment variables should be extracted from process.env here.
  const {
    PORT,
    NODE_ENV,
    SHOPIFY_API_SECRET_KEY,
    SHOPIFY_API_KEY,
    SCOPES,
  } = process.env; // eslint-disable-line no-process-env

  return {
    PORT: PORT || "8081",
    NODE_ENV: NODE_ENV || "dev",
    SHOPIFY_API_SECRET_KEY: validateEnvironmentVariableOrExit(
      SHOPIFY_API_SECRET_KEY
    ),
    SHOPIFY_API_KEY: validateEnvironmentVariableOrExit(SHOPIFY_API_KEY),
    SCOPES: SCOPES || "",
  };
}
