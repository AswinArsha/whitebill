// Ledger.jsx

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const Ledger = ({ role, userId }) => {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [bills, setBills] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingBills, setLoadingBills] = useState(true);

  useEffect(() => {
    fetchClientDetails();
    fetchInvoices();
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const fetchClientDetails = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('client_name')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('Error fetching client details:', error);
      toast.error('Failed to load client details.');
    } else {
      setClient(data);
    }
  };

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('buyer_id', clientId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices.');
    } else {
      setInvoices(data);
    }
    setLoadingInvoices(false);
  };

  const fetchBills = async () => {
    // First, fetch the client name to match in bills.client_details
    if (!client) {
      // Client details not yet fetched
      setLoadingBills(false);
      return;
    }

    const clientName = client.client_name;

    // Perform a case-insensitive partial match on client_details
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .ilike('client_details', `%${clientName}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load bills.');
    } else {
      setBills(data);
    }
    setLoadingBills(false);
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" reverseOrder={false} />
      <Link to="/home/clients">
        <Button variant="ghost" className="flex items-center space-x-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Clients</span>
        </Button>
      </Link>
      <h2 className="text-2xl font-semibold mb-4">
        {client ? `Ledger for ${client.client_name}` : 'Loading...'}
      </h2>

      {/* Invoices Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Invoices</h3>
        {loadingInvoices ? (
          <p>Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <p>No invoices found for this client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow rounded-lg">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Invoice No</th>
                  <th className="py-2 px-4 border-b">Date</th>
                  <th className="py-2 px-4 border-b">Buyer GST</th>
                  <th className="py-2 px-4 border-b">Taxable Value</th>
                  <th className="py-2 px-4 border-b">CGST</th>
                  <th className="py-2 px-4 border-b">SGST</th>
                  <th className="py-2 px-4 border-b">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="text-center">
                    <td className="py-2 px-4 border-b">{invoice.invoice_no}</td>
                    <td className="py-2 px-4 border-b">{new Date(invoice.date).toLocaleDateString()}</td>
                    <td className="py-2 px-4 border-b">{invoice.buyer_gst || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{invoice.taxable_value?.toFixed(2) || '0.00'}</td>
                    <td className="py-2 px-4 border-b">{invoice.cgst?.toFixed(2) || '0.00'}</td>
                    <td className="py-2 px-4 border-b">{invoice.sgst?.toFixed(2) || '0.00'}</td>
                    <td className="py-2 px-4 border-b">{invoice.total?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bills Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Bills</h3>
        {loadingBills ? (
          <p>Loading bills...</p>
        ) : bills.length === 0 ? (
          <p>No bills found for this client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow rounded-lg">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Date</th>
                  <th className="py-2 px-4 border-b">Invoice Number</th>
                  <th className="py-2 px-4 border-b">Total</th>
                  <th className="py-2 px-4 border-b">Payment Mode</th>
                  <th className="py-2 px-4 border-b">Balance</th>
                  <th className="py-2 px-4 border-b">Payment Done</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="text-center">
                    <td className="py-2 px-4 border-b">{bill.date || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{bill.invoice_number || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{bill.total?.toFixed(2) || '0.00'}</td>
                    <td className="py-2 px-4 border-b">{bill.payment_mode || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{bill.balance?.toFixed(2) || '0.00'}</td>
                    <td className="py-2 px-4 border-b">
                      {bill.payment_done ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ledger;
