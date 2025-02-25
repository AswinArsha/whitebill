"use client"

import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, FileText, Receipt, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const Ledger = ({ role, userId }) => {
  const { clientId } = useParams()
  const [client, setClient] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [bills, setBills] = useState([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [loadingBills, setLoadingBills] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchClientDetails()
    fetchInvoices()
    fetchBills()
  }, [clientId])

  const fetchClientDetails = async () => {
    const { data, error } = await supabase.from("clients").select("client_name").eq("id", clientId).single()

    if (error) {
      console.error("Error fetching client details:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load client details.",
      })
    } else {
      setClient(data)
    }
  }

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("buyer_id", clientId)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching invoices:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load invoices.",
      })
    } else {
      setInvoices(data)
    }
    setLoadingInvoices(false)
  }

  const fetchBills = async () => {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("buyer_id", clientId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching bills:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load bills.",
      })
    } else {
      setBills(data)
    }
    setLoadingBills(false)
  }

  const renderTable = (data, columns, loading) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
    }

    if (data.length === 0) {
      return <p className="text-center py-4">No data found.</p>
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.format ? column.format(item[column.key]) : item[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  const invoiceColumns = [
    { key: "invoice_no", label: "Invoice No" },
    { key: "date", label: "Date", format: (value) => new Date(value).toLocaleDateString() },
    { key: "buyer_gst", label: "Buyer GST" },
    { key: "taxable_value", label: "Taxable Value", format: (value) => value?.toFixed(2) || "0.00" },
    { key: "cgst", label: "CGST", format: (value) => value?.toFixed(2) || "0.00" },
    { key: "sgst", label: "SGST", format: (value) => value?.toFixed(2) || "0.00" },
    { key: "total", label: "Total", format: (value) => value?.toFixed(2) || "0.00" },
  ]

  const billColumns = [
    { key: "date", label: "Date" },
    { key: "invoice_number", label: "Invoice Number" },
    { key: "total", label: "Total", format: (value) => value?.toFixed(2) || "0.00" },
    { key: "payment_mode", label: "Payment Mode" },
    { key: "balance", label: "Balance", format: (value) => value?.toFixed(2) || "0.00" },
    { key: "payment_done", label: "Payment Done", format: (value) => (value ? "Yes" : "No") },
  ]

  return (
    <div className="container ">
      <Link to="/home/clients">
        <Button variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{client ? `Ledger for ${client.client_name}` : "Loading..."}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="invoices">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invoices">
                <FileText className="mr-2 h-4 w-4" />
                GST
              </TabsTrigger>
              <TabsTrigger value="bills">
                <Receipt className="mr-2 h-4 w-4" />
                Bills
              </TabsTrigger>
            </TabsList>
            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>GST Bills</CardTitle>
                </CardHeader>
                <CardContent>{renderTable(invoices, invoiceColumns, loadingInvoices)}</CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="bills">
              <Card>
                <CardHeader>
                  <CardTitle>Bills</CardTitle>
                </CardHeader>
                <CardContent>{renderTable(bills, billColumns, loadingBills)}</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default Ledger

