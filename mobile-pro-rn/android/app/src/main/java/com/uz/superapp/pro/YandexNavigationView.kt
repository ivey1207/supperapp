package com.uz.superapp.pro

import android.content.Context
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.yandex.mapkit.MapKitFactory
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.map.MapWindow
import com.yandex.mapkit.mapview.MapView
import com.yandex.mapkit.navigation.NavigationFactory
import com.yandex.mapkit.navigation.Navigator
import com.yandex.mapkit.navigation.guidance.GuidanceListener

class YandexNavigationViewManager : ViewGroupManager<YandexNavigationView>() {
    override fun getName(): String = "YandexNavigationView"

    override fun createViewInstance(reactContext: ThemedReactContext): YandexNavigationView {
        return YandexNavigationView(reactContext)
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
        return mutableMapOf(
            "onArrival" to mutableMapOf("registrationName" to "onArrival")
        )
    }
}

class YandexNavigationView(context: Context) : FrameLayout(context) {
    private val mapView: MapView = MapView(context)
    private var navigator: Navigator? = null

    init {
        addView(mapView)
        // Initialize MapKit if not already done
        MapKitFactory.getInstance().onStart()
        mapView.onStart()
        
        setupNavigator()
    }

    private fun setupNavigator() {
        navigator = NavigationFactory.getInstance().createNavigator()
        // Link navigator to this MapView's map
        // Note: In newer SDKs, this is handled by Navigator.setNavigatorMapView
        // For 4.8.0-full:
        // navigator?.setNavigatorMapView(mapView) 
        
        navigator?.setGuidanceListener(object : GuidanceListener {
            override fun onEndOfRoute() {
                val event = Arguments.createMap()
                event.putBoolean("isFinalDestination", true)
                (context as ReactContext).getJSModule(RCTEventEmitter::class.java)
                    .receiveEvent(id, "onArrival", event)
            }
            // ... other overrides
            override fun onManeuver() {}
            override fun onFastestRouteChanged() {}
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

    fun onStart() {
        MapKitFactory.getInstance().onStart()
        mapView.onStart()
    }

    fun onStop() {
        mapView.onStop()
        MapKitFactory.getInstance().onStop()
    }
}
