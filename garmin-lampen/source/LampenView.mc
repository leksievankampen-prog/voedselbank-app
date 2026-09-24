import Toybox.Application.Storage;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

class LampenView extends WatchUi.View {
    private var _status as String? = null;
    private var _busy as Boolean = false;

    function initialize() {
        View.initialize();
    }

    function onStatus(text as String?, busy as Boolean) as Void {
        _status = text;
        _busy = busy;
        WatchUi.requestUpdate();
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;

        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        // Bovenaan: wat START doet (alle lampen of een gekozen scene).
        var sceneName = Storage.getValue("scene_name");
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.12, Graphics.FONT_XTINY,
            sceneName != null ? sceneName as String : "Alle lampen", Graphics.TEXT_JUSTIFY_CENTER);

        // Grote aan/uit-knop.
        var by = h * 0.42;
        var r = w * 0.2;
        dc.setColor(_busy ? Graphics.COLOR_DK_GRAY : Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(cx, by, r);
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(6);
        dc.drawArc(cx, by, r * 0.5, Graphics.ARC_CLOCKWISE, 60, 120);
        dc.drawLine(cx, by - r * 0.65, cx, by - r * 0.1);
        dc.setPenWidth(1);

        // Onderaan: status of uitleg.
        var text = _status;
        if (text == null) {
            text = getApp().client.hasLogin() ? "START = alles uit" : "START = inloggen";
        }
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.66, Graphics.FONT_XTINY, text, Graphics.TEXT_JUSTIFY_CENTER);
    }
}
