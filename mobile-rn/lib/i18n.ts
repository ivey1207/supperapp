import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

const resources = {
    uz: {
        translation: {
            home: 'Asosiy',
            explorer: 'Xarita',
            scan: 'Skaner',
            activity: 'Buyurtmalar',
            profile: 'Profil',
            searchPlaceholder: 'Yoqilg\'i, moyka yoki xizmatlarni izlang',
            onlineStatus: 'SIZ ONLINE — BUYURTMALARNI QABUL QILING',
            offlineStatus: 'SIZ OFFLINE',
            availableOrders: 'Mavjud buyurtmalar',
            acceptOrder: 'QABUL QILISH',
            wash: 'MOYKA',
            repair: 'USTA',
            homeWash: 'Moyka Uyga',
            callMaster: 'Usta chaqirish',
            onSite: 'Joyiga borish',
            roadBreak: 'Yo\'lda buzilish',
            recommended: 'TAVSIYA ETILADI',
            popularNearby: 'Yaqin atrofdagi mashhurlar',
            seeAll: 'Barchasi',
            errorStatus: 'Holatni yangilab bo\'lmadi. Aloqani tekshiring.',
            errorAccept: 'Buyurtmani qabul qilib bo\'lmadi',
            detectingLocation: 'Joylashuv aniqlanmoqda...',
            locationDisabled: 'Joylashuv o\'chirilgan',
            yourStory: 'Sizning tarixingiz',
            points: 'BALLAR',
            orders: 'BUYURTMALAR',
            rating: 'REITING',
            editProfile: 'Profilni tahrirlash',
            wallet: 'Hamyon va To\'lovlar',
            workInSuperApp: 'SuperApp da ishlash',
            notifications: 'Bildirishnomalar',
            helpSupport: 'Yordam va Qo\'llab-quvvatlash',
            logout: 'Chiqish',
            comingSoon: 'Tez kunda',
            featureInDev: 'Bu bo\'lim yaqinda paydo bo\'ladi!',
            walletBalance: 'Hamyon balansi',
            addPoints: 'Ball qo\'shish',
            findingDriver: 'Haydovchi qidirilmoqda...',
            driverAssigned: 'Haydovchi tayinlandi',
            noActiveDeliveries: 'Faol yetkazib berishlar yo\'q',
            orderDelivery: 'Yetkazib berishga buyurtma berish',
            auth: {
                loginTitle: 'Xush kelibsiz',
                loginSubtitle: 'Telefon raqamingiz orqali kiring',
                emailOrPhone: 'Email yoki telefon',
                password: 'Parol',
                loginWithOtp: 'SMS kod orqali kirish',
                loginWithPassword: 'Parol orqali kirish',
                phone: 'Telefon raqam',
                email: 'Elektron pochta',
                sendCode: 'Kodni yuborish',
                enterOtp: 'SMS kodni kiriting',
                verifyBtn: 'Tasdiqlash',
                otpSent: 'Kod yuborildi',
                enterPhone: 'Telefonni kiriting',
                enterEmail: 'Emailni kiriting',
            },
            welcome: {
                login: 'Kirish',
                subtitle: 'Barcha xizmatlar bir joyda',
            }
        }
    },
    ru: {
        translation: {
            home: 'Главная',
            explorer: 'Карта',
            scan: 'Сканер',
            activity: 'Заказы',
            profile: 'Профиль',
            searchPlaceholder: 'Поиск топлива, мойки или услуг',
            onlineStatus: 'ВЫ В СЕТИ — ПРИНИМАЙТЕ ЗАКАЗЫ',
            offlineStatus: 'ВЫ ОФФЛАЙН',
            availableOrders: 'Доступные заказы',
            acceptOrder: 'ПРИНЯТЬ ЗАКАЗ',
            wash: 'МОЙКА',
            repair: 'РЕМОНТ',
            homeWash: 'Мойка Домой',
            callMaster: 'Вызов мастера',
            onSite: 'Выезд на место',
            roadBreak: 'Поломка в пути',
            recommended: 'РЕКОМЕНДУЕМ',
            popularNearby: 'Популярное рядом',
            seeAll: 'Все',
            errorStatus: 'Не удалось обновить статус. Проверьте сеть.',
            errorAccept: 'Не удалось принять заказ',
            detectingLocation: 'Определение локации...',
            locationDisabled: 'Локация отключена',
            yourStory: 'Ваша история',
            points: 'БАЛЛЫ',
            orders: 'ЗАКАЗЫ',
            rating: 'РЕЙТИНГ',
            editProfile: 'Изменить профиль',
            wallet: 'Кошелек и Оплаты',
            workInSuperApp: 'Работа в SuperApp',
            notifications: 'Уведомления',
            helpSupport: 'Помощь и Поддержка',
            logout: 'Выйти',
            comingSoon: 'В разработке',
            featureInDev: 'Этот раздел скоро появится!',
            walletBalance: 'Баланс кошелька',
            addPoints: 'Добавить баллы',
            findingDriver: 'Поиск водителя...',
            driverAssigned: 'Водитель назначен',
            noActiveDeliveries: 'Нет активных доставок',
            orderDelivery: 'Заказать доставку',
            auth: {
                loginTitle: 'С возвращением',
                loginSubtitle: 'Войдите в свой аккаунт',
                emailOrPhone: 'Email или телефон',
                password: 'Пароль',
                loginWithOtp: 'Вход по SMS',
                loginWithPassword: 'Вход по паролю',
                phone: 'Номер телефона',
                email: 'Эл. почта',
                sendCode: 'Отправить код',
                enterOtp: 'Введите код из SMS',
                verifyBtn: 'Подтвердить',
                otpSent: 'Код отправлен',
                enterPhone: 'Введите телефон',
                enterEmail: 'Введите email',
            },
            welcome: {
                login: 'Войти',
                subtitle: 'Все услуги в одном приложении',
            }
        }
    },
    en: {
        translation: {
            home: 'Home',
            explorer: 'Map',
            scan: 'Scan',
            activity: 'Orders',
            profile: 'Profile',
            searchPlaceholder: 'Search for gas, washes, or services',
            onlineStatus: 'YOU ARE ONLINE — ACCEPT ORDERS',
            offlineStatus: 'YOU ARE OFFLINE',
            availableOrders: 'Available Orders',
            acceptOrder: 'ACCEPT ORDER',
            wash: 'WASH',
            repair: 'REPAIR',
            homeWash: 'Home Wash',
            callMaster: 'Call Specialist',
            onSite: 'On-site service',
            roadBreak: 'Road breakdown',
            recommended: 'RECOMMENDED',
            popularNearby: 'Popular Nearby',
            seeAll: 'See all',
            errorStatus: 'Failed to update status. Check connection.',
            errorAccept: 'Could not accept order',
            detectingLocation: 'Detecting location...',
            locationDisabled: 'Location disabled',
            yourStory: 'Your story',
            points: 'POINTS',
            orders: 'ORDERS',
            rating: 'RATING',
            editProfile: 'Edit Profile',
            wallet: 'Wallet & Payments',
            workInSuperApp: 'Work in SuperApp',
            notifications: 'Notifications',
            helpSupport: 'Help & Support',
            logout: 'Log Out',
            featureInDev: 'This section is coming soon!',
            walletBalance: 'Wallet Balance',
            addPoints: 'Add Points',
            findingDriver: 'Finding driver...',
            driverAssigned: 'Driver assigned',
            noActiveDeliveries: 'No active deliveries',
            orderDelivery: 'Order a Delivery',
            auth: {
                loginTitle: 'Welcome Back',
                loginSubtitle: 'Login to your account',
                emailOrPhone: 'Email or phone',
                password: 'Password',
                loginWithOtp: 'Login with SMS',
                loginWithPassword: 'Login with Password',
                phone: 'Phone number',
                email: 'Email address',
                sendCode: 'Send Code',
                enterOtp: 'Enter SMS Code',
                verifyBtn: 'Verify',
                otpSent: 'Code sent',
                enterPhone: 'Enter phone',
                enterEmail: 'Enter email',
            },
            welcome: {
                login: 'Login',
                subtitle: 'All services in one app',
            }
        }
    }
};

const initI18n = async () => {
    let savedLanguage = await AsyncStorage.getItem('app_lang');
    if (!savedLanguage) {
        savedLanguage = Localization.locale.split('-')[0];
    }

    i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: savedLanguage || 'uz',
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false
            }
        });
};

initI18n();

export default i18n;
