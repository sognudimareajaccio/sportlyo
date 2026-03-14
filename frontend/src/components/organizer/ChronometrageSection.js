import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Download, Copy, Timer, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import api from '../../services/api';

export const ChronometrageSection = ({ events, chronoEventId, setChronoEventId }) => {
  const selectedEvent = events.find(e => e.event_id === chronoEventId);

  return (
    <div>
      <div className="mb-6">
        <Label className="text-xs font-heading uppercase text-slate-500 mb-2 block">Selectionnez un evenement</Label>
        <Select value={chronoEventId} onValueChange={setChronoEventId}>
          <SelectTrigger className="w-full max-w-md" data-testid="chrono-event-select"><SelectValue placeholder="Choisir un evenement..." /></SelectTrigger>
          <SelectContent>
            {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {chronoEventId && selectedEvent ? (
        <div className="bg-white border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-asphalt to-slate-800 text-white p-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-brand flex items-center justify-center flex-shrink-0"><Clock className="w-7 h-7 text-white" /></div>
              <div>
                <h3 className="font-heading text-xl font-bold uppercase mb-2">Chronometrage automatique</h3>
                <p className="text-slate-300 text-lg leading-relaxed">
                  SportLyo se connecte directement aux logiciels de chronometrage professionnels.
                  Les temps de vos coureurs apparaissent <strong className="text-brand">en direct</strong> sur votre page resultats, sans aucune saisie manuelle.
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 border-b">
            <h4 className="font-heading font-bold uppercase text-sm tracking-wider text-slate-500 mb-6">Comment ca marche ?</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { n: '1', title: 'Vous exportez la liste', desc: 'Cliquez sur "Export CSV" ci-dessous. Envoyez ce fichier a votre chronometreur. Il contient les noms, dossards et puces RFID de chaque inscrit.' },
                { n: '2', title: 'Vous donnez le code', desc: "Copiez le code d'integration ci-dessous et envoyez-le a votre prestataire chronometrage. Il le configure une seule fois dans son logiciel." },
                { n: '3', title: 'Les temps arrivent en direct', desc: "Le jour J, quand un coureur passe devant une borne RFID, son temps s'affiche instantanement sur la page resultats." },
              ].map(s => (
                <div key={s.n} className="text-center">
                  <div className="w-12 h-12 bg-brand/10 text-brand flex items-center justify-center mx-auto mb-3 text-xl font-heading font-bold">{s.n}</div>
                  <h5 className="font-heading font-bold mb-2">{s.title}</h5>
                  <p className="text-sm text-slate-600">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 border-b bg-slate-50">
            <h4 className="font-heading font-bold uppercase text-sm tracking-wider text-slate-500 mb-4">Logiciels compatibles</h4>
            <div className="flex flex-wrap gap-3">
              {['RaceResult', 'Chronotrack', 'MyLaps', 'Webscorer', 'ChronoPlus', 'Wiclax'].map(name => (
                <span key={name} className="bg-white border border-slate-200 px-4 py-2 font-heading text-sm font-bold">{name}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">Tout logiciel capable d'envoyer des requetes HTTP (webhook) est compatible.</p>
          </div>

          <div className="p-8 border-b">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand text-white flex items-center justify-center font-heading font-bold text-sm">1</div>
              <h4 className="font-heading font-bold uppercase">Exporter la liste des inscrits</h4>
            </div>
            <p className="text-slate-600 mb-4">Ce fichier CSV contient tous les inscrits avec leurs dossards et numeros de puce RFID.</p>
            <Button variant="outline" onClick={async () => {
              try {
                const res = await api.get(`/timing/export/${chronoEventId}`, { responseType: 'blob' });
                const blob = new Blob([res.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `inscrits_${selectedEvent.title.replace(/\s/g, '_')}.csv`;
                document.body.appendChild(a); a.click(); a.remove();
                toast.success('CSV exporte');
              } catch { toast.error('Erreur export'); }
            }} className="gap-2" data-testid="export-timing-csv">
              <Download className="w-4 h-4" /> Telecharger le CSV des inscrits
            </Button>
          </div>

          <div className="p-8 border-b">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand text-white flex items-center justify-center font-heading font-bold text-sm">2</div>
              <h4 className="font-heading font-bold uppercase">Code d'integration pour votre chronometreur</h4>
            </div>
            <p className="text-slate-600 mb-2">Copiez les informations ci-dessous et envoyez-les a votre prestataire chronometrage.</p>
            <p className="text-sm text-brand font-medium mb-6">Votre chronometreur saura exactement quoi en faire.</p>

            <div className="bg-asphalt text-white p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-heading text-sm font-bold uppercase tracking-wider text-brand">Configuration SportLyo</span>
                <button onClick={() => {
                  const text = `=== SPORTLYO — Configuration Chronometrage ===\n\nEvenement : ${selectedEvent.title}\nDate : ${selectedEvent.date}\n\nURL endpoint : ${window.location.origin}/api/rfid-read\nMethode : POST\nFormat : JSON\nEvent ID : ${chronoEventId}\n\n--- Format du body JSON ---\n{\n  "chip_id": "[numero de puce RFID]",\n  "timestamp": "[horodatage ISO8601]",\n  "checkpoint": "start" ou "finish",\n  "event_id": "${chronoEventId}"\n}\n\n--- Import en masse ---\nURL : ${window.location.origin}/api/rfid-read/bulk\n{\n  "event_id": "${chronoEventId}",\n  "readings": [\n    {"chip_id":"...","timestamp":"...","checkpoint":"start"},\n    {"chip_id":"...","timestamp":"...","checkpoint":"finish"}\n  ]\n}\n\nPage resultats en direct : ${window.location.origin}/results/${chronoEventId}`;
                  navigator.clipboard.writeText(text);
                  toast.success('Configuration complete copiee !');
                }} className="bg-brand/20 hover:bg-brand/30 text-brand px-3 py-1.5 text-xs font-heading font-bold uppercase flex items-center gap-1.5 transition-colors" data-testid="copy-full-config">
                  <Copy className="w-3.5 h-3.5" /> Tout copier
                </button>
              </div>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1"><span className="text-slate-400 w-28 flex-shrink-0">Evenement</span><span className="text-white font-bold">{selectedEvent.title}</span></div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1"><span className="text-slate-400 w-28 flex-shrink-0">URL endpoint</span><span className="text-brand">{window.location.origin}/api/rfid-read</span></div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1"><span className="text-slate-400 w-28 flex-shrink-0">Methode</span><span className="text-green-400">POST</span></div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1"><span className="text-slate-400 w-28 flex-shrink-0">Format</span><span className="text-yellow-300">JSON</span></div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1"><span className="text-slate-400 w-28 flex-shrink-0">Event ID</span><span className="text-brand font-bold">{chronoEventId}</span></div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-heading font-bold uppercase text-slate-500">Format des donnees</span>
                <button onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify({ chip_id: "NUMERO_PUCE", timestamp: new Date().toISOString(), checkpoint: "start", event_id: chronoEventId }, null, 2));
                  toast.success('Copie !');
                }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1"><Copy className="w-3 h-3" /> Copier</button>
              </div>
              <pre className="bg-slate-50 border p-4 text-sm font-mono overflow-x-auto">
{JSON.stringify({ chip_id: "NUMERO_PUCE_RFID", timestamp: "2026-03-15T09:00:00.000Z", checkpoint: "start | finish", event_id: chronoEventId }, null, 2)}
              </pre>
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p><strong>chip_id</strong> — Le numero de la puce RFID portee par le coureur</p>
                <p><strong>timestamp</strong> — L'heure exacte du passage (format ISO8601)</p>
                <p><strong>checkpoint</strong> — <code className="bg-slate-100 px-1">"start"</code> au depart, <code className="bg-slate-100 px-1">"finish"</code> a l'arrivee</p>
                <p><strong>event_id</strong> — L'identifiant unique de votre evenement</p>
              </div>
            </div>
          </div>

          <details className="p-8 border-b">
            <summary className="flex items-center gap-3 cursor-pointer select-none">
              <div className="w-8 h-8 bg-slate-200 text-slate-600 flex items-center justify-center font-heading font-bold text-sm">+</div>
              <h4 className="font-heading font-bold uppercase text-slate-600">Exemples de code avances (pour developpeurs)</h4>
            </summary>
            <div className="mt-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading text-sm font-bold uppercase">cURL — Signal de depart</span>
                  <button onClick={() => {
                    const cmd = `curl -X POST ${window.location.origin}/api/rfid-read \\\n  -H "Content-Type: application/json" \\\n  -d '{"chip_id":"PUCE_123","timestamp":"${new Date().toISOString()}","checkpoint":"start","event_id":"${chronoEventId}"}'`;
                    navigator.clipboard.writeText(cmd); toast.success('Copie !');
                  }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1"><Copy className="w-3 h-3" /> Copier</button>
                </div>
                <pre className="bg-slate-900 text-green-400 p-4 text-xs overflow-x-auto font-mono">
{`curl -X POST ${window.location.origin}/api/rfid-read \\
  -H "Content-Type: application/json" \\
  -d '{"chip_id":"PUCE_123","timestamp":"${new Date().toISOString()}","checkpoint":"start","event_id":"${chronoEventId}"}'`}
                </pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading text-sm font-bold uppercase">Python</span>
                  <button onClick={() => {
                    const code = `import requests\nfrom datetime import datetime, timezone\n\nAPI_URL = "${window.location.origin}/api/rfid-read"\nEVENT_ID = "${chronoEventId}"\n\ndef send_rfid(chip_id, checkpoint="finish"):\n    response = requests.post(API_URL, json={\n        "chip_id": chip_id,\n        "timestamp": datetime.now(timezone.utc).isoformat(),\n        "checkpoint": checkpoint,\n        "event_id": EVENT_ID\n    })\n    return response.json()\n\nsend_rfid("PUCE_123", "start")\nsend_rfid("PUCE_123", "finish")`;
                    navigator.clipboard.writeText(code); toast.success('Copie !');
                  }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1"><Copy className="w-3 h-3" /> Copier</button>
                </div>
                <pre className="bg-slate-900 text-blue-300 p-4 text-xs overflow-x-auto font-mono">
{`import requests
from datetime import datetime, timezone

API_URL = "${window.location.origin}/api/rfid-read"
EVENT_ID = "${chronoEventId}"

def send_rfid(chip_id, checkpoint="finish"):
    response = requests.post(API_URL, json={
        "chip_id": chip_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checkpoint": checkpoint,
        "event_id": EVENT_ID
    })
    return response.json()

send_rfid("PUCE_123", "start")
send_rfid("PUCE_123", "finish")`}
                </pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading text-sm font-bold uppercase">Import en masse</span>
                  <button onClick={() => {
                    const code = `POST ${window.location.origin}/api/rfid-read/bulk\n\n${JSON.stringify({event_id: chronoEventId, readings: [{chip_id:"PUCE_1",timestamp:"2026-03-15T09:00:00Z",checkpoint:"start"},{chip_id:"PUCE_1",timestamp:"2026-03-15T09:45:13Z",checkpoint:"finish"}]}, null, 2)}`;
                    navigator.clipboard.writeText(code); toast.success('Copie !');
                  }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1"><Copy className="w-3 h-3" /> Copier</button>
                </div>
                <pre className="bg-slate-900 text-yellow-300 p-4 text-xs overflow-x-auto font-mono">
{`POST ${window.location.origin}/api/rfid-read/bulk

${JSON.stringify({
  event_id: chronoEventId,
  readings: [
    {chip_id:"PUCE_1",timestamp:"2026-03-15T09:00:00Z",checkpoint:"start"},
    {chip_id:"PUCE_1",timestamp:"2026-03-15T09:45:13Z",checkpoint:"finish"}
  ]
}, null, 2)}`}
                </pre>
              </div>
            </div>
          </details>

          <div className="p-8 bg-brand/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-brand text-white flex items-center justify-center font-heading font-bold text-sm">3</div>
              <h4 className="font-heading font-bold uppercase">Voir les resultats en direct</h4>
            </div>
            <p className="text-slate-600 mb-4">Partagez ce lien avec vos participants et spectateurs.</p>
            <div className="flex items-center gap-3">
              <Input value={`${window.location.origin}/results/${chronoEventId}`} readOnly className="flex-1 bg-white" />
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/results/${chronoEventId}`); toast.success('Lien copie !'); }} className="gap-2">
                <Copy className="w-4 h-4" /> Copier
              </Button>
              <Link to={`/results/${chronoEventId}`}>
                <Button className="btn-primary gap-2"><ExternalLink className="w-4 h-4" /> Ouvrir</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 p-12 text-center">
          <Timer className="w-16 h-16 mx-auto mb-4 text-slate-200" />
          <h3 className="font-heading font-bold text-lg uppercase mb-2">Selectionnez un evenement</h3>
          <p className="text-slate-500">Choisissez un evenement ci-dessus pour acceder a la configuration du chronometrage</p>
        </div>
      )}
    </div>
  );
};
