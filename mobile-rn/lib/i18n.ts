import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

const resources = {
    ru: {
        translation: {
            welcome: {
                title: "SuperApp Узбекистан",
                subtitle: "Все услуги для вашего авто в одном приложении",
                login: "Войти",
                register: "Создать аккаунт",
                terms: "Нажимая «Войти», вы соглашаетесь с нашими Условиями использования"
            },
            auth: {
                loginTitle: "С возвращением",
                loginSubtitle: "Войдите в свой аккаунт",
                emailOrPhone: "Email или Телефон",
                phone: "Номер телефона",
                email: "Email адрес",
                password: "Пароль",
                forgotPassword: "Забыли пароль?",
                signUp: "Зарегистрироваться",
                sendCode: "Получить код",
                verifyBtn: "Подтвердить и войти",
                enterOtp: "Введите код подтверждения",
                otpSent: "Мы отправили код на ваш email",
                loginWithPassword: "Вход по паролю",
                loginWithOtp: "Вход по коду (OTP)",
                noAccount: "Нет аккаунта?",
                alreadyHaveAccount: "Уже есть аккаунт?",
                createAccount: "Создать аккаунт",
                fullName: "Полное имя",
                carModel: "Модель автомобиля",
                agreeTerms: "Я согласен с условиями и политикой конфиденциальности",
                agreeTermsError: "Пожалуйста, примите условия",
                completeRegistration: "Завершить регистрацию",
                enterName: "Введите ваше имя",
                enterEmail: "Введите корректный email",
                enterPassword: "Минимум 6 символов",
                enterPhone: "Введите номер телефона"
            }
        }
    },
    uz: {
        translation: {
            welcome: {
                title: "SuperApp O'zbekiston",
                subtitle: "Barcha avto xizmatlar bitta ilovada",
                login: "Kirish",
                register: "Ro'yxatdan o'tish",
                terms: "Kirish tugmasini bosish orqali siz foydalanish shartlariga rozilik bildirasiz"
            },
            auth: {
                loginTitle: "Xush kelibsiz",
                loginSubtitle: "Hisobingizga kiring",
                emailOrPhone: "Email yoki Telefon",
                phone: "Telefon raqami",
                email: "Email manzili",
                password: "Parol",
                forgotPassword: "Parolni unutdingizmi?",
                signUp: "Ro'yxatdan o'tish",
                sendCode: "Kodni olish",
                verifyBtn: "Tasdiqlash va kirish",
                enterOtp: "Tasdiqlash kodini kiriting",
                otpSent: "Biz kodni emailingizga yubordik",
                loginWithPassword: "Parol orqali kirish",
                loginWithOtp: "Kod orqali kirish (OTP)",
                noAccount: "Hisobingiz yo'qmi?",
                alreadyHaveAccount: "Hisobingiz bormi?",
                createAccount: "Hisob yaratish",
                fullName: "To'liq ism",
                carModel: "Avtomobil modeli",
                agreeTerms: "Men shartlar va maxfiylik siyosatiga roziman",
                agreeTermsError: "Iltimos, shartlarga rozi bo'ling",
                completeRegistration: "Ro'yxatdan o'tishni yakunlash",
                enterName: "Ismingizni kiriting",
                enterEmail: "To'g'ri email kiriting",
                enterPassword: "Kamida 6 ta belgi",
                enterPhone: "Telefon raqamini kiriting"
            }
        }
    },
    en: {
        translation: {
            welcome: {
                title: "SuperApp Uzbekistan",
                subtitle: "All car services in one application",
                login: "Log In",
                register: "Create Account",
                terms: "By clicking Log In, you agree to our Terms of Use"
            },
            auth: {
                loginTitle: "Welcome Back",
                loginSubtitle: "Log in to your account",
                emailOrPhone: "Email or Phone",
                phone: "Phone Number",
                email: "Email Address",
                password: "Password",
                forgotPassword: "Forgot Password?",
                signUp: "Sign Up",
                sendCode: "Send Code",
                verifyBtn: "Verify & Log In",
                enterOtp: "Enter verification code",
                otpSent: "We sent a code to your email",
                loginWithPassword: "Login with Password",
                loginWithOtp: "Login with Code (OTP)",
                noAccount: "Don't have an account?",
                alreadyHaveAccount: "Already have an account?",
                createAccount: "Create Account",
                fullName: "Full Name",
                carModel: "Car Model",
                agreeTerms: "I agree to Terms and Privacy Policy",
                agreeTermsError: "Please agree to Terms",
                completeRegistration: "Complete Registration",
                enterName: "Enter your name",
                enterEmail: "Enter valid email",
                enterPassword: "Minimum 6 characters",
                enterPhone: "Enter phone number"
            }
        }
    },
    tr: {
        translation: {
            welcome: {
                title: "SuperApp Özbekistan",
                subtitle: "Tüm araç hizmetleri tek bir uygulamada",
                login: "Giriş Yap",
                register: "Hesap Oluştur",
                terms: "Giriş Yap'a tıklayarak Kullanım Koşullarımızı kabul etmiş olursunuz"
            },
            auth: {
                loginTitle: "Tekrar Hoşgeldiniz",
                loginSubtitle: "Hesabınıza giriş yapın",
                emailOrPhone: "E-posta veya Telefon",
                phone: "Telefon Numarası",
                email: "E-posta Adresi",
                password: "Şifre",
                forgotPassword: "Şifremi Unuttum?",
                signUp: "Kayıt Ol",
                sendCode: "Kod Gönder",
                verifyBtn: "Doğrula ve Giriş Yap",
                enterOtp: "Doğrulama kodunu girin",
                otpSent: "E-postanıza bir kod gönderdik",
                loginWithPassword: "Şifre ile Giriş",
                loginWithOtp: "Kod ile Giriş (OTP)",
                noAccount: "Hesabınız yok mu?",
                alreadyHaveAccount: "Zaten hesabınız var mı?",
                createAccount: "Hesap Oluştur",
                fullName: "Ad Soyad",
                carModel: "Araç Modeli",
                agreeTerms: "Şartları ve Gizlilik Politikasını kabul ediyorum",
                agreeTermsError: "Lütfen şartları kabul edin",
                completeRegistration: "Kaydı Tamamla",
                enterName: "Adınızı girin",
                enterEmail: "Geçerli e-posta girin",
                enterPassword: "En az 6 karakter",
                enterPhone: "Telefon numarası girin"
            }
        }
    }
};

const LANGUAGE_KEY = 'user_language';

const initI18n = async () => {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    const deviceLanguage = Localization.getLocales()[0].languageCode;

    i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: savedLanguage || deviceLanguage || 'ru',
            fallbackLng: 'ru',
            interpolation: {
                escapeValue: false
            }
        });
};

initI18n();

export default i18n;
