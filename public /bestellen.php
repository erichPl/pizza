<?php
header("Content-Type: application/json");
header("Cache-Control: no-cache, must-revalidate");
header("Connection: close");
date_default_timezone_set('Europe/Berlin');
clearstatcache();

$orderFile   = __DIR__ . '/bestellungen.json';
$productFile = __DIR__ . '/produkte.json';
$productPhp  = __DIR__ . '/produkte_cache.php';
$historyFile = __DIR__ . '/historie.json';

// Initialisierung der Dateien falls nicht vorhanden
if (!file_exists($orderFile)) file_put_contents($orderFile, json_encode([]));
if (!file_exists($historyFile)) file_put_contents($historyFile, json_encode([]));

// --- 1. GET-ABFRAGEN (LADEN) ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // A) Speisekarte laden (für Gast & Admin)
    if (isset($_GET['get_products'])) {
        $mtime = file_exists($productFile) ? filemtime($productFile) : time();
        header("X-Menu-Version: " . $mtime); 
        if (file_exists($productPhp)) {
            include($productPhp);
            echo json_encode($cache);
        } else {
            echo file_get_contents($productFile) ?: "[]";
        }
    } 
    // B) Historie laden (für Dashboard-Verlauf)
    else if (isset($_GET['get_history'])) {
        echo file_get_contents($historyFile) ?: "[]";
    }
    // C) Aktuelle Bestellungen laden (für Dashboard Hauptseite)
    else {
        echo file_get_contents($orderFile) ?: "[]";
    }
    exit;
}

// --- 2. POST-ABFRAGEN (SCHREIBEN) ---
$inputJSON = file_get_contents('php://input');
$inputData = json_decode($inputJSON, true);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // A) Admin speichert die Speisekarte
    if (isset($inputData['save_products'])) {
        file_put_contents($productFile, json_encode($inputData['products']));
        $phpCode = "<?php \$cache = " . var_export($inputData['products'], true) . "; ?>";
        file_put_contents($productPhp, $phpCode);
        echo json_encode(["status" => "saved"]);
    } 
    
    // B) Bar-Dashboard erledigt eine Bestellung (Verschieben in Historie)
    // B) Bar-Dashboard erledigt Bestellung (MIT DATUM & ZEIT)
  // B) Bar-Dashboard erledigt Bestellung (MIT KATEGORIEN)
    else if (isset($inputData['delete_id'])) {
        $orders = json_decode(file_get_contents($orderFile), true) ?: [];
        $idx = (int)$inputData['delete_id'];

        if (isset($orders[$idx])) {
            $erledigt = $orders[$idx];
            $produkte = json_decode(file_get_contents($productFile), true) ?: [];
            
            $gesamtSumme = 0;
            $artikel_liste = [];
            $kategorien_liste = []; // NEU: Für die spätere Auswertung

            $bestellteTeile = explode(", ", $erledigt['artikel']);
            foreach ($bestellteTeile as $teil) {
                // Sucht nach "(Kategorie) Menge x Name"
                if (preg_match('/\((.+)\)\s+(\d+)x\s+(.+)/', $teil, $matches)) {
                    $kat   = $matches[1];
                    $menge = (int)$matches[2];
                    $name  = trim($matches[3]);
                    $zeilenPreis = 0;

                    // Preis suchen wie bisher
                    foreach ($produkte as $p) {
                        if ($p['type'] === 'product' && trim($p['name']) === $name) {
                            $einzel = (float)str_replace(',', '.', $p['price']);
                            // Ändere diese Zeile in der Schleife:
							$zeilenPreis = round($menge * $einzel, 2); // RUNDET AUF 2 STELLEN
                            $gesamtSumme += $zeilenPreis;
                            break;
                        }
                    }

                    $preisText = number_format($zeilenPreis, 2, ',', '.') . " €";
                    // Wir speichern die Kategorie jetzt mit im Namen oder als separates Feld
                    $artikel_liste[] = "[$kat] $menge" . "x $name | $preisText";
                    
                    // NEU: Strukturierte Daten für die Grafik-Auswertung
                    $kategorien_liste[] = [
                        "kategorie" => $kat,
                        "summe" => round($zeilenPreis, 2) // NOCHMALS SICHER GEHEN
                    ];
                }
            }

            $erledigt['datum'] = date("d.m.Y");
            $erledigt['erledigt_um'] = date("H:i");
            $erledigt['gesamtpreis'] = number_format($gesamtSumme, 2, ',', '.') . " €";
            $erledigt['artikel_liste'] = $artikel_liste;
            $erledigt['kategorien_details'] = $kategorien_liste; // NEU in historie.json

            $history = json_decode(@file_get_contents($historyFile), true) ?: [];
            $history[] = $erledigt;
            file_put_contents($historyFile, json_encode($history));

            array_splice($orders, $idx, 1);
            file_put_contents($orderFile, json_encode($orders));
        }
        echo json_encode(["status" => "ok"]);
        exit;
    }
    // C) Gast schickt neue Bestellung ab
    else {
        $orders = json_decode(file_get_contents($orderFile), true) ?: [];
        $orders[] = [
            "zeit" => date("H:i"),
            "tisch" => $inputData['tisch'] ?? '?',
            "artikel" => $inputData['artikel'] ?? ''
        ];
        file_put_contents($orderFile, json_encode($orders));
        echo json_encode(["status" => "ok"]);
    }
    exit;
}
?>
