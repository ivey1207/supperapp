import { NativeModules, NativeEventEmitter, requireNativeComponent, ViewProps } from 'react-native';

const { YandexNavi } = NativeModules;

export const YandexNavigationView = requireNativeComponent<any>('YandexNavigationView');

if (!YandexNavi) {
  console.warn('YandexNavi native module is not available');
}

const eventEmitter = YandexNavi ? new NativeEventEmitter(YandexNavi) : null;

export interface YandexNaviInterface {
  initialize(): void;
  startNavigation(lat: number, lon: number): Promise<void>;
  stopNavigation(): void;
  onArrival(callback: (event: { isFinalDestination: boolean }) => void): void;
}

const YandexNaviWrapper: YandexNaviInterface = {
  initialize: () => {
    YandexNavi?.initialize();
  },
  startNavigation: (lat: number, lon: number) => {
    return YandexNavi?.startNavigation(lat, lon);
  },
  stopNavigation: () => {
    YandexNavi?.stopNavigation();
  },
  onArrival: (callback) => {
    eventEmitter?.addListener('onArrival', callback);
  },
};

export default YandexNaviWrapper;
