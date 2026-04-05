export type AuthLocale = 'hu' | 'en';

type AuthTranslations = {
  loginTitle: string;
  loginSubtitle: string;
  loginWithGoogle: string;
  loginWithEmail: string;
  hideEmailLogin: string;
  emailAndPassword: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  hidePassword: string;
  showPassword: string;
  forgotPassword: string;
  loginButton: string;
  loggingIn: string;
  noAccount: string;
  registerHere: string;
  registerTitle: string;
  registerSubtitle: string;
  registerWithGoogle: string;
  registerWithEmail: string;
  hideEmailRegister: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  confirmPasswordLabel: string;
  registerButton: string;
  registering: string;
  alreadyHasAccount: string;
  loginHere: string;
  validEmailError: string;
  emailRequiredError: string;
  passwordMinLengthError: string;
  passwordRequiredError: string;
  usernameFormatError: string;
  usernameNoSpacesError: string;
  usernameMinLengthError: string;
  usernameRequiredError: string;
  nameMinLengthError: string;
  nameRequiredError: string;
  confirmPasswordRequiredError: string;
  passwordsDoNotMatchError: string;
  registerGenericError: string;
  registerGoogleError: string;
};

const translations: Record<AuthLocale, AuthTranslations> = {
  hu: {
    loginTitle: 'Bejelentkezés',
    loginSubtitle: 'Lépj be a tDarts fiókodba',
    loginWithGoogle: 'Bejelentkezés Google-lel',
    loginWithEmail: 'Bejelentkezés emaillel',
    hideEmailLogin: 'Emailes bejelentkezés elrejtése',
    emailAndPassword: 'email és jelszó',
    emailLabel: 'Email cím',
    emailPlaceholder: 'email@example.com',
    passwordLabel: 'Jelszó',
    passwordPlaceholder: '••••••••',
    hidePassword: 'Jelszó elrejtése',
    showPassword: 'Jelszó megjelenítése',
    forgotPassword: 'Elfelejtett jelszó?',
    loginButton: 'Bejelentkezés',
    loggingIn: 'Bejelentkezés...',
    noAccount: 'Még nincs fiókod?',
    registerHere: 'Regisztrálj itt',
    registerTitle: 'Regisztráció',
    registerSubtitle: 'Hozd létre a tDarts fiókod',
    registerWithGoogle: 'Regisztráció Google-lel',
    registerWithEmail: 'Regisztráció emaillel',
    hideEmailRegister: 'Emailes regisztráció elrejtése',
    usernameLabel: 'Felhasználónév',
    usernamePlaceholder: 'felhasznalo123',
    fullNameLabel: 'Teljes név',
    fullNamePlaceholder: 'Kovács János',
    confirmPasswordLabel: 'Jelszó megerősítése',
    registerButton: 'Regisztráció',
    registering: 'Regisztráció...',
    alreadyHasAccount: 'Már van fiókod?',
    loginHere: 'Jelentkezz be itt',
    validEmailError: 'Érvényes email címet adj meg',
    emailRequiredError: 'Email cím kötelező',
    passwordMinLengthError: 'A jelszónak legalább 6 karakter hosszúnak kell lennie',
    passwordRequiredError: 'Jelszó kötelező',
    usernameFormatError: 'A felhasználónév csak betűket, számokat és aláhúzásokat tartalmazhat',
    usernameNoSpacesError: 'A felhasználónév nem tartalmazhat szóközöket',
    usernameMinLengthError: 'A felhasználónévnek legalább 3 karakter hosszúnak kell lennie',
    usernameRequiredError: 'Felhasználónév kötelező',
    nameMinLengthError: 'A névnek legalább 2 karakter hosszúnak kell lennie',
    nameRequiredError: 'Név kötelező',
    confirmPasswordRequiredError: 'Jelszó megerősítés kötelező',
    passwordsDoNotMatchError: 'A jelszavak nem egyeznek',
    registerGenericError: 'Hiba történt a regisztráció során',
    registerGoogleError: 'Hiba történt a Google regisztráció során',
  },
  en: {
    loginTitle: 'Sign in',
    loginSubtitle: 'Sign in to your tDarts account',
    loginWithGoogle: 'Sign in with Google',
    loginWithEmail: 'Sign in with email',
    hideEmailLogin: 'Hide email sign-in',
    emailAndPassword: 'email and password',
    emailLabel: 'Email',
    emailPlaceholder: 'email@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    hidePassword: 'Hide password',
    showPassword: 'Show password',
    forgotPassword: 'Forgot password?',
    loginButton: 'Sign in',
    loggingIn: 'Signing in...',
    noAccount: "Don't have an account?",
    registerHere: 'Register here',
    registerTitle: 'Register',
    registerSubtitle: 'Create your tDarts account',
    registerWithGoogle: 'Register with Google',
    registerWithEmail: 'Register with email',
    hideEmailRegister: 'Hide email registration',
    usernameLabel: 'Username',
    usernamePlaceholder: 'username123',
    fullNameLabel: 'Full name',
    fullNamePlaceholder: 'John Doe',
    confirmPasswordLabel: 'Confirm password',
    registerButton: 'Register',
    registering: 'Registering...',
    alreadyHasAccount: 'Already have an account?',
    loginHere: 'Sign in here',
    validEmailError: 'Please enter a valid email address',
    emailRequiredError: 'Email is required',
    passwordMinLengthError: 'Password must be at least 6 characters',
    passwordRequiredError: 'Password is required',
    usernameFormatError: 'Username can only contain letters, numbers, and underscores',
    usernameNoSpacesError: 'Username cannot contain spaces',
    usernameMinLengthError: 'Username must be at least 3 characters',
    usernameRequiredError: 'Username is required',
    nameMinLengthError: 'Name must be at least 2 characters',
    nameRequiredError: 'Name is required',
    confirmPasswordRequiredError: 'Password confirmation is required',
    passwordsDoNotMatchError: 'Passwords do not match',
    registerGenericError: 'Registration failed',
    registerGoogleError: 'Google registration failed',
  },
};

export function getAuthTranslations(locale?: string): AuthTranslations {
  const normalized = (locale || '').toLowerCase();
  if (normalized.startsWith('en')) return translations.en;
  return translations.hu;
}
