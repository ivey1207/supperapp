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
                password: "Пароль",
                forgotPassword: "Забыли пароль?",
                signUp: "Регистрация",
                sendCode: "Отправить код",
                verifyBtn: "Подтвердить и продолжить"
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
                password: "Parol",
                forgotPassword: "Parolni unutdingizmi?",
                signUp: "Ro'yxatdan o'tish",
                sendCode: "Kodni yuborish",
                verifyBtn: "Tasdiqlash va davom etish"
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
