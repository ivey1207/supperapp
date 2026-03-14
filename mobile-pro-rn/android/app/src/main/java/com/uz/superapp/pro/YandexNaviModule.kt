package com.uz.superapp.pro

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.yandex.mapkit.MapKitFactory
import com.yandex.mapkit.directions.DirectionsFactory
import com.yandex.mapkit.directions.driving.*
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.navigation.NavigationFactory
import com.yandex.mapkit.navigation.Navigator
import com.yandex.mapkit.navigation.guidance.GuidanceListener
import com.yandex.mapkit.RequestPoint
import com.yandex.mapkit.RequestPointType
import com.yandex.runtime.Error
import java.util.ArrayList

class YandexNaviModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var navigator: Navigator? = null
    private var drivingRouter: DrivingRouter? = null

    override fun getName(): String {
        return "YandexNavi"
    }

    @ReactMethod
    fun initialize() {
        if (navigator == null) {
            navigator = NavigationFactory.getInstance().createNavigator()
            drivingRouter = DirectionsFactory.getInstance().createDrivingRouter()
            navigator?.setGuidanceListener(object : GuidanceListener {
                override fun onManeuver() {
                    // Send event to JS
                }
                override fun onFastestRouteChanged() {
                }
                override fun onEndOfRoute() {
                    val map = Arguments.createMap()
                    map.putBoolean("isFinalDestination", true)
                    sendEvent("onArrival", map)
                }
                override fun onRoadNameChanged() {}
                override fun onLocationUpdated() {}
                override fun onSpeedLimitUpdate() {}
                override fun onSpeedLimitExceeded() {}
                override fun onSpeedLimitNotExceeded() {}
                override fun onSpeedLimitExceededUpdated() {}
                override fun onParkingRoutesChanged() {}
                override fun onAlternativesChanged() {}
                override fun onBetterAlternativeAvailable() {}
            })
        }
    }

    @ReactMethod
    fun startNavigation(lat: Double, lon: Double, promise: Promise) {
        val requestPoints = ArrayList<RequestPoint>()
        // Current location from navigator is needed, but for simplicity let's use routing from current position
        // Navigator has a location manager
        val targetPoint = Point(lat, lon)
        requestPoints.add(RequestPoint(targetPoint, RequestPointType.WAYPOINT, null, null))

        val options = DrivingOptions()
        val vehicleOptions = VehicleOptions()

        drivingRouter?.requestRoutes(requestPoints, options, vehicleOptions, object : DrivingSession.DrivingRouteListener {
            override fun onDrivingRoutes(routes: MutableList<DrivingRoute>) {
                if (routes.isNotEmpty()) {
                    navigator?.drivingOptions = options
                    navigator?.route = routes[0]
                    navigator?.startGuidance(routes[0])
                    promise.resolve(true)
                } else {
                    promise.reject("ROUTING_ERROR", "No routes found")
                }
            }

            override fun onDrivingRoutesError(error: Error) {
                promise.reject("ROUTING_ERROR", error.toString())
            }
        })
    }

    @ReactMethod
    fun stopNavigation() {
        navigator?.stopGuidance()
        navigator?.reset()
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
