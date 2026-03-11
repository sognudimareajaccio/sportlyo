import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../services/api';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const checkPaymentStatus = async (attempts = 0) => {
      const maxAttempts = 5;
      const pollInterval = 2000;

      if (attempts >= maxAttempts) {
        setStatus('timeout');
        return;
      }

      try {
        const response = await api.get(`/payments/status/${sessionId}`);
        
        if (response.data.payment_status === 'paid') {
          setStatus('success');
          setPaymentData(response.data);
          return;
        } else if (response.data.status === 'expired') {
          setStatus('expired');
          return;
        }

        // Continue polling
        setTimeout(() => checkPaymentStatus(attempts + 1), pollInterval);
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
      }
    };

    checkPaymentStatus();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-brand animate-spin mx-auto mb-6" />
            <h1 className="font-heading text-2xl font-bold mb-2">Vérification du paiement...</h1>
            <p className="text-slate-500">Veuillez patienter quelques instants.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="font-heading text-2xl font-bold mb-2">Paiement réussi !</h1>
            <p className="text-slate-500 mb-6">
              Votre inscription a été confirmée. Vous recevrez un email de confirmation.
            </p>
            {paymentData && (
              <div className="bg-slate-50 p-4 rounded-sm mb-6">
                <p className="text-sm text-slate-500">Montant payé</p>
                <p className="font-heading text-3xl font-bold text-brand">
                  {paymentData.amount}€
                </p>
              </div>
            )}
            <div className="space-y-3">
              <Link to="/dashboard/registrations">
                <Button className="w-full btn-primary">
                  Voir mes inscriptions
                </Button>
              </Link>
              <Link to="/events">
                <Button variant="outline" className="w-full">
                  Explorer d'autres événements
                </Button>
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="font-heading text-2xl font-bold mb-2">Erreur de paiement</h1>
            <p className="text-slate-500 mb-6">
              Une erreur s'est produite lors du traitement de votre paiement.
            </p>
            <Link to="/events">
              <Button className="w-full btn-primary">
                Retour aux événements
              </Button>
            </Link>
          </>
        )}

        {status === 'expired' && (
          <>
            <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-6" />
            <h1 className="font-heading text-2xl font-bold mb-2">Session expirée</h1>
            <p className="text-slate-500 mb-6">
              Votre session de paiement a expiré. Veuillez réessayer.
            </p>
            <Link to="/events">
              <Button className="w-full btn-primary">
                Retour aux événements
              </Button>
            </Link>
          </>
        )}

        {status === 'timeout' && (
          <>
            <Loader2 className="w-16 h-16 text-orange-500 mx-auto mb-6" />
            <h1 className="font-heading text-2xl font-bold mb-2">Vérification en cours</h1>
            <p className="text-slate-500 mb-6">
              La vérification prend plus de temps que prévu. Consultez vos emails pour la confirmation.
            </p>
            <Link to="/dashboard/registrations">
              <Button className="w-full btn-primary">
                Voir mes inscriptions
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
