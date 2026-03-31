import type { UserAttributeKey } from 'aws-amplify/auth';
import { confirmResetPassword, confirmSignIn, confirmSignUp, resendSignUpCode, resetPassword, signIn, signUp } from 'aws-amplify/auth';
import type { AuthFormData, AuthTouchData, PasswordSettings, SocialProvider, ValidatorResult } from '../../types';
export declare const defaultServices: {
    getAmplifyConfig(): Promise<{
        loginMechanisms: ("email" | "phone_number" | "username")[];
        signUpAttributes: UserAttributeKey[];
        socialProviders: SocialProvider[];
        identityPoolId: string;
        allowGuestAccess?: boolean;
        userPoolClientId?: never;
        userPoolId?: never;
        userPoolEndpoint?: never;
        loginWith?: never;
        signUpVerificationMethod?: never;
        userAttributes?: never;
        mfa?: never;
        passwordFormat?: never;
        groups?: never;
    } | {
        loginMechanisms: ("email" | "phone_number" | "username")[];
        signUpAttributes: UserAttributeKey[];
        socialProviders: SocialProvider[];
        userPoolClientId: string;
        userPoolId: string;
        userPoolEndpoint?: string;
        signUpVerificationMethod?: "link" | "code";
        loginWith?: {
            oauth?: import("@aws-amplify/core").OAuthConfig;
            username?: boolean;
            email?: boolean;
            phone?: boolean;
        };
        userAttributes?: Partial<Record<import("@aws-amplify/core/internals/utils").AuthStandardAttributeKey, {
            required: boolean;
        }>>;
        mfa?: {
            status?: import("@aws-amplify/core/dist/esm/singleton/Auth/types").CognitoUserPoolConfigMfaStatus;
            totpEnabled?: boolean;
            smsEnabled?: boolean;
        };
        passwordFormat?: {
            minLength?: number;
            requireLowercase?: boolean;
            requireUppercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialCharacters?: boolean;
        };
        groups?: Record<string, {
            [x: string]: number;
        }>[];
        identityPoolId?: never;
        allowGuestAccess?: never;
    } | {
        loginMechanisms: ("email" | "phone_number" | "username")[];
        signUpAttributes: UserAttributeKey[];
        socialProviders: SocialProvider[];
        identityPoolId: never;
        allowGuestAccess?: never;
        userPoolClientId: never;
        userPoolId: never;
        userPoolEndpoint?: never;
        loginWith?: never;
        signUpVerificationMethod?: never;
        userAttributes?: never;
        mfa?: never;
        passwordFormat?: never;
        groups?: never;
    } | {
        loginMechanisms: ("email" | "phone_number" | "username")[];
        signUpAttributes: UserAttributeKey[];
        socialProviders: SocialProvider[];
        identityPoolId: string;
        allowGuestAccess?: boolean;
        userPoolClientId: never;
        userPoolId: never;
        userPoolEndpoint?: never;
        loginWith?: never;
        signUpVerificationMethod?: never;
        userAttributes?: never;
        mfa?: never;
        passwordFormat?: never;
        groups?: never;
    } | {
        loginMechanisms: ("email" | "phone_number" | "username")[];
        signUpAttributes: UserAttributeKey[];
        socialProviders: SocialProvider[];
        userPoolClientId: never;
        userPoolId: never;
        userPoolEndpoint?: never;
        signUpVerificationMethod?: never;
        loginWith?: never;
        userAttributes?: never;
        mfa?: never;
        passwordFormat?: never;
        groups?: never;
        identityPoolId: never;
        allowGuestAccess?: never;
    } | {
        loginMechanisms: ("email" | "phone_number" | "username")[];
        signUpAttributes: UserAttributeKey[];
        socialProviders: SocialProvider[];
        userPoolClientId: string;
        userPoolId: string;
        userPoolEndpoint?: string;
        signUpVerificationMethod?: "link" | "code";
        loginWith?: {
            oauth?: import("@aws-amplify/core").OAuthConfig;
            username?: boolean;
            email?: boolean;
            phone?: boolean;
        };
        userAttributes?: Partial<Record<import("@aws-amplify/core/internals/utils").AuthStandardAttributeKey, {
            required: boolean;
        }>>;
        mfa?: {
            status?: import("@aws-amplify/core/dist/esm/singleton/Auth/types").CognitoUserPoolConfigMfaStatus;
            totpEnabled?: boolean;
            smsEnabled?: boolean;
        };
        passwordFormat?: {
            minLength?: number;
            requireLowercase?: boolean;
            requireUppercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialCharacters?: boolean;
        };
        groups?: Record<string, {
            [x: string]: number;
        }>[];
        identityPoolId: never;
        allowGuestAccess?: never;
    } | {
        loginMechanisms: ("email" | "phone_number" | "username")[];
        signUpAttributes: UserAttributeKey[];
        socialProviders: SocialProvider[];
        userPoolClientId: never;
        userPoolId: never;
        userPoolEndpoint?: never;
        signUpVerificationMethod?: never;
        loginWith?: never;
        userAttributes?: never;
        mfa?: never;
        passwordFormat?: never;
        groups?: never;
        identityPoolId: string;
        allowGuestAccess?: boolean;
    } | {
        loginMechanisms: ("email" | "phone_number" | "username")[];
        signUpAttributes: UserAttributeKey[];
        socialProviders: SocialProvider[];
        userPoolClientId: string;
        userPoolId: string;
        userPoolEndpoint?: string;
        signUpVerificationMethod?: "link" | "code";
        loginWith?: {
            oauth?: import("@aws-amplify/core").OAuthConfig;
            username?: boolean;
            email?: boolean;
            phone?: boolean;
        };
        userAttributes?: Partial<Record<import("@aws-amplify/core/internals/utils").AuthStandardAttributeKey, {
            required: boolean;
        }>>;
        mfa?: {
            status?: import("@aws-amplify/core/dist/esm/singleton/Auth/types").CognitoUserPoolConfigMfaStatus;
            totpEnabled?: boolean;
            smsEnabled?: boolean;
        };
        passwordFormat?: {
            minLength?: number;
            requireLowercase?: boolean;
            requireUppercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialCharacters?: boolean;
        };
        groups?: Record<string, {
            [x: string]: number;
        }>[];
        identityPoolId: never;
        allowGuestAccess?: never;
    } | {
        loginMechanisms: ("email" | "phone_number" | "username")[];
        signUpAttributes: UserAttributeKey[];
        socialProviders: SocialProvider[];
        userPoolClientId: string;
        userPoolId: string;
        userPoolEndpoint?: string;
        signUpVerificationMethod?: "link" | "code";
        loginWith?: {
            oauth?: import("@aws-amplify/core").OAuthConfig;
            username?: boolean;
            email?: boolean;
            phone?: boolean;
        };
        userAttributes?: Partial<Record<import("@aws-amplify/core/internals/utils").AuthStandardAttributeKey, {
            required: boolean;
        }>>;
        mfa?: {
            status?: import("@aws-amplify/core/dist/esm/singleton/Auth/types").CognitoUserPoolConfigMfaStatus;
            totpEnabled?: boolean;
            smsEnabled?: boolean;
        };
        passwordFormat?: {
            minLength?: number;
            requireLowercase?: boolean;
            requireUppercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialCharacters?: boolean;
        };
        groups?: Record<string, {
            [x: string]: number;
        }>[];
        identityPoolId: string;
        allowGuestAccess?: boolean;
    }>;
    getCurrentUser: () => Promise<import("aws-amplify/auth").AuthUser>;
    handleSignIn: typeof signIn;
    handleSignUp: typeof signUp;
    handleConfirmSignIn: typeof confirmSignIn;
    handleConfirmSignUp: typeof confirmSignUp;
    handleForgotPasswordSubmit: typeof confirmResetPassword;
    handleForgotPassword: typeof resetPassword;
    handleResendSignUpCode: typeof resendSignUpCode;
    validateCustomSignUp(_: AuthFormData, __: AuthTouchData): Promise<ValidatorResult>;
    validateFormPassword(formData: AuthFormData, touchData: AuthTouchData, passwordSettings: PasswordSettings): Promise<ValidatorResult>;
    validateConfirmPassword(formData: AuthFormData, touchData: AuthTouchData): Promise<ValidatorResult>;
    validatePreferredUsername(_: AuthFormData, __: AuthTouchData): Promise<ValidatorResult>;
};
