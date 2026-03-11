import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

const PaymentCancelPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 text-center">
        <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-6" />
        <h1 className="font-heading text-2xl font-bold mb-2">Paiement annulé</h1>
        <p className="text-slate-500 mb-6">
          Votre paiement a été annulé. Aucun montant n'a été débité.
        </p>
        <div className="space-y-3">
          <Link to="/events">
            <Button className="w-full btn-primary">
              Retour aux événements
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" className="w-full">
              Mon tableau de bord
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
