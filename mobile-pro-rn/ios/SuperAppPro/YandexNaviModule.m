#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(YandexNavi, RCTEventEmitter)

RCT_EXTERN_METHOD(initialize)
RCT_EXTERN_METHOD(startNavigation:(double)lat lon:(double)lon resolver:(RCTPromiseResolveBlock)resolver rejecter:(RCTPromiseRejectBlock)rejecter)
RCT_EXTERN_METHOD(stopNavigation)

@end
