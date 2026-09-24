import Toybox.Application;
import Toybox.Application.Properties;
import Toybox.Application.Storage;
import Toybox.Attention;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.StringUtil;
import Toybox.Time;

const ST_API = "https://api.smartthings.com/v1";
const ST_AUTH_URL = "https://api.smartthings.com/oauth/authorize";
const ST_TOKEN_URL = "https://auth-global.api.smartthings.com/oauth/token";
// Moet exact zo als redirect URI in je SmartThings OAuth-app staan.
const ST_REDIRECT_URI = "https://localhost";
const ST_SCOPES = "r:devices:* x:devices:* r:scenes:* x:scenes:*";

// Praat via de Garmin Connect-app op je telefoon met de SmartThings API.
// Inloggen gaat via OAuth, zodat het token zichzelf ververst (een
// Personal Access Token van SmartThings verloopt na 24 uur).
class SmartThingsClient {
    private var _listener as Method? = null;
    private var _pending as Symbol? = null;
    private var _retried as Boolean = false;
    private var _busy as Boolean = false;
    private var _deviceIds as Array<String> = [] as Array<String>;
    private var _index as Number = 0;
    private var _failed as Number = 0;
    private var _scenesCallback as Method? = null;

    function initialize() {
    }

    // listener: Method(text as String or Null, busy as Boolean)
    function setListener(listener as Method) as Void {
        _listener = listener;
    }

    function isBusy() as Boolean {
        return _busy;
    }

    function hasLogin() as Boolean {
        return Storage.getValue("refresh_token") != null;
    }

    // ---------- Acties ----------

    function allOff() as Void {
        if (_busy) {
            return;
        }
        runWithToken(:doAllOff);
    }

    // callback: Method(scenes as Array<Array<String>> or Null)
    function loadScenes(callback as Method) as Void {
        if (_busy) {
            return;
        }
        _scenesCallback = callback;
        runWithToken(:doLoadScenes);
    }

    function login() as Void {
        var clientId = setting("clientId");
        if (clientId.length() == 0 || setting("clientSecret").length() == 0) {
            _pending = null;
            report("Vul Client ID/Secret\nin via Garmin Connect", false);
            return;
        }
        report("Log in op je\ntelefoon", false);
        Communications.makeOAuthRequest(
            ST_AUTH_URL,
            {
                "client_id" => clientId,
                "response_type" => "code",
                "redirect_uri" => ST_REDIRECT_URI,
                "scope" => ST_SCOPES
            },
            ST_REDIRECT_URI,
            Communications.OAUTH_RESULT_TYPE_URL,
            { "code" => "code", "error" => "error" }
        );
    }

    function logout() as Void {
        Storage.deleteValue("access_token");
        Storage.deleteValue("refresh_token");
        Storage.deleteValue("expires_at");
    }

    // ---------- Token-beheer ----------

    private function runWithToken(action as Symbol) as Void {
        _pending = action;
        _retried = false;
        if (!hasLogin()) {
            login();
            return;
        }
        var expiresAt = Storage.getValue("expires_at");
        if (Storage.getValue("access_token") == null || expiresAt == null
                || Time.now().value() >= (expiresAt as Number)) {
            refresh();
        } else {
            runPending();
        }
    }

    private function runPending() as Void {
        var action = _pending;
        if (action != null) {
            method(action).invoke();
        }
    }

    private function refresh() as Void {
        report("Verbinden...", true);
        requestToken({
            "grant_type" => "refresh_token",
            "refresh_token" => Storage.getValue("refresh_token")
        });
    }

    function onOAuthMessage(message as Communications.OAuthMessage) as Void {
        var data = message.data;
        if (data == null || data["code"] == null) {
            _pending = null;
            report("Inloggen mislukt", false);
            return;
        }
        report("Inloggen...", true);
        requestToken({
            "grant_type" => "authorization_code",
            "code" => data["code"],
            "redirect_uri" => ST_REDIRECT_URI
        });
    }

    private function requestToken(params as Dictionary) as Void {
        var clientId = setting("clientId");
        params.put("client_id", clientId);
        Communications.makeWebRequest(
            ST_TOKEN_URL,
            params,
            {
                :method => Communications.HTTP_REQUEST_METHOD_POST,
                :headers => {
                    "Content-Type" => Communications.REQUEST_CONTENT_TYPE_URL_ENCODED,
                    "Authorization" => "Basic " + StringUtil.encodeBase64(clientId + ":" + setting("clientSecret"))
                },
                :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
            },
            method(:onToken)
        );
    }

    function onToken(code as Number, data) as Void {
        if (code == 200 && data instanceof Dictionary && data["access_token"] != null) {
            Storage.setValue("access_token", data["access_token"]);
            if (data["refresh_token"] != null) {
                Storage.setValue("refresh_token", data["refresh_token"]);
            }
            var expiresIn = data["expires_in"];
            if (!(expiresIn instanceof Number)) {
                expiresIn = 3600;
            }
            Storage.setValue("expires_at", Time.now().value() + (expiresIn as Number) - 60);
            if (_pending != null) {
                runPending();
            } else {
                report("Ingelogd!\nSTART = alles uit", false);
            }
            return;
        }
        _pending = null;
        if (code == 400 || code == 401) {
            // Refresh token ingetrokken of verlopen (30 dagen niet gebruikt).
            logout();
            report("Login verlopen.\nSTART = inloggen", false);
        } else {
            report(errorText(code), false);
        }
    }

    // Bij een 401 één keer het token verversen en de actie opnieuw starten.
    private function retryOnAuthError(code as Number) as Boolean {
        if (code == 401 && !_retried) {
            _retried = true;
            Storage.deleteValue("access_token");
            refresh();
            return true;
        }
        return false;
    }

    // ---------- Alles uit ----------

    function doAllOff() as Void {
        var sceneId = Storage.getValue("scene_id");
        if (sceneId != null) {
            report("Scene starten...", true);
            apiRequest(ST_API + "/scenes/" + sceneId + "/execute", {},
                Communications.HTTP_REQUEST_METHOD_POST, method(:onSceneExecuted));
            return;
        }
        _deviceIds = [] as Array<String>;
        report("Lampen zoeken...", true);
        apiRequest(ST_API + "/devices", { "capability" => "switch" },
            Communications.HTTP_REQUEST_METHOD_GET, method(:onDevices));
    }

    function onSceneExecuted(code as Number, data) as Void {
        if (retryOnAuthError(code)) {
            return;
        }
        _pending = null;
        if (code == 200) {
            buzz();
            report("Klaar!", false);
        } else {
            report(errorText(code), false);
        }
    }

    function onDevices(code as Number, data) as Void {
        if (retryOnAuthError(code)) {
            return;
        }
        if (code != 200 || !(data instanceof Dictionary)) {
            _pending = null;
            report(errorText(code), false);
            return;
        }
        var items = data["items"];
        if (items instanceof Array) {
            for (var i = 0; i < items.size(); i++) {
                var item = items[i];
                if (item instanceof Dictionary && item["deviceId"] != null && isTarget(item)) {
                    _deviceIds.add(item["deviceId"] as String);
                }
            }
        }

        // SmartThings geeft grote lijsten in pagina's terug.
        var next = null;
        var links = data["_links"];
        if (links instanceof Dictionary && links["next"] instanceof Dictionary) {
            next = links["next"]["href"];
        }
        if (next != null) {
            apiRequest(next as String, null, Communications.HTTP_REQUEST_METHOD_GET, method(:onDevices));
            return;
        }

        if (_deviceIds.size() == 0) {
            _pending = null;
            report("Geen lampen\ngevonden", false);
            return;
        }
        _index = 0;
        _failed = 0;
        sendNextOff();
    }

    private function isTarget(device as Dictionary) as Boolean {
        if (Properties.getValue("onlyLights") != true) {
            return true;
        }
        var components = device["components"];
        if (!(components instanceof Array)) {
            return false;
        }
        for (var i = 0; i < components.size(); i++) {
            var categories = components[i]["categories"];
            if (categories instanceof Array) {
                for (var j = 0; j < categories.size(); j++) {
                    if (categories[j]["name"] == "Light") {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Eén voor één, want de Bluetooth-wachtrij naar de telefoon is klein.
    private function sendNextOff() as Void {
        report("Uit " + (_index + 1) + "/" + _deviceIds.size(), true);
        apiRequest(
            ST_API + "/devices/" + _deviceIds[_index] + "/commands",
            { "commands" => [{ "component" => "main", "capability" => "switch", "command" => "off" }] },
            Communications.HTTP_REQUEST_METHOD_POST,
            method(:onCommand)
        );
    }

    function onCommand(code as Number, data) as Void {
        if (code != 200) {
            _failed++;
        }
        _index++;
        if (_index < _deviceIds.size()) {
            sendNextOff();
            return;
        }
        _pending = null;
        var ok = _deviceIds.size() - _failed;
        if (ok > 0) {
            buzz();
        }
        var text = ok + (ok == 1 ? " lamp uit" : " lampen uit");
        if (_failed > 0) {
            text += "\n" + _failed + " mislukt";
        }
        report(text, false);
    }

    // ---------- Scenes ----------

    function doLoadScenes() as Void {
        report("Scenes laden...", true);
        apiRequest(ST_API + "/scenes", null, Communications.HTTP_REQUEST_METHOD_GET, method(:onScenes));
    }

    function onScenes(code as Number, data) as Void {
        if (retryOnAuthError(code)) {
            return;
        }
        _pending = null;
        var callback = _scenesCallback;
        _scenesCallback = null;
        if (code != 200 || !(data instanceof Dictionary)) {
            report(errorText(code), false);
            return;
        }
        var scenes = [] as Array<Array<String>>;
        var items = data["items"];
        if (items instanceof Array) {
            for (var i = 0; i < items.size(); i++) {
                var item = items[i];
                if (item instanceof Dictionary && item["sceneId"] != null) {
                    var name = item["sceneName"];
                    scenes.add([item["sceneId"] as String, name != null ? name as String : "Scene"]);
                }
            }
        }
        if (scenes.size() == 0) {
            report("Geen scenes\ngevonden", false);
            return;
        }
        report(null, false);
        if (callback != null) {
            callback.invoke(scenes);
        }
    }

    // ---------- Hulpfuncties ----------

    private function apiRequest(url as String, params as Dictionary?, httpMethod, callback as Method) as Void {
        var headers = { "Authorization" => "Bearer " + Storage.getValue("access_token") };
        if (httpMethod == Communications.HTTP_REQUEST_METHOD_POST) {
            headers.put("Content-Type", Communications.REQUEST_CONTENT_TYPE_JSON);
        }
        Communications.makeWebRequest(url, params, {
            :method => httpMethod,
            :headers => headers,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        }, callback);
    }

    private function setting(key as String) as String {
        var value = Properties.getValue(key);
        if (value instanceof String && value.length() > 0) {
            return value;
        }
        return key.equals("clientId") ? CONFIG_CLIENT_ID : CONFIG_CLIENT_SECRET;
    }

    private function report(text as String?, busy as Boolean) as Void {
        _busy = busy;
        var listener = _listener;
        if (listener != null) {
            listener.invoke(text, busy);
        }
    }

    private function buzz() as Void {
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(60, 300)]);
        }
    }

    private function errorText(code as Number) as String {
        switch (code) {
            case Communications.BLE_CONNECTION_UNAVAILABLE:
                return "Geen verbinding\nmet telefoon";
            case Communications.NETWORK_REQUEST_TIMED_OUT:
                return "Time-out,\nprobeer opnieuw";
            case Communications.NETWORK_RESPONSE_OUT_OF_MEMORY:
            case Communications.NETWORK_RESPONSE_TOO_LARGE:
                return "Te veel apparaten.\nKies een scene";
            case 401:
            case 403:
                return "Geen toegang.\nOpnieuw inloggen";
            default:
                return "Fout " + code;
        }
    }
}
