<?php
  /*
   All Emoncms code is released under the GNU Affero General Public License.
   See COPYRIGHT.txt and LICENSE.txt.

    ---------------------------------------------------------------------
    Emoncms - open source energy visualisation
    Part of the OpenEnergyMonitor project:
    http://openenergymonitor.org
  */

// no direct access
defined('EMONCMS_EXEC') or die('Restricted access');

function sapcompare_controller()
{
    global $session, $route;

    if ($route->action == '' && $session['write']) {
        return view("Modules/sapcompare/view.php",array());
    }

    return array('content'=>false);
}
