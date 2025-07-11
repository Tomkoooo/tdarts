export interface IUser {
    _id: string;
    username: string;
    name: string
    email: string;
    password: string;
    isVerified: boolean;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin: Date | null;
    codes: {
        reset_password: string | null;
        verify_email: string | null;
        two_factor_auth: string | null;
    }
}

export interface IUserDocument extends Document, IUser {
    matchPassword: (password: string) => Promise<boolean>;
    generateResetPasswordCode: () => Promise<string>;
    generateVerifyEmailCode: () => Promise<string>;
    generateTwoFactorAuthCode: () => Promise<string>;
    verifyEmail: () => Promise<void>;
    resetPassword: (newPassword: string) => Promise<void>;
    verifyTwoFactorAuth: (code: string) => Promise<boolean>;
    updateLastLogin: () => Promise<void>;
    toJSON: () => Omit<IUser, 'password'>;
}
