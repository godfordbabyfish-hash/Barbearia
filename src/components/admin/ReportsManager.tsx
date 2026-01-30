import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, Download, Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  period: string;
  barberId?: string;
  barberName?: string;
  appointments: any[];
  productSales: any[];
  advances: any[];
  summary: {
    totalAppointments: number;
    grossRevenue: number;
    totalCommissions: number;
    barbershopProfit: number;
    totalAdvances: number;
    netProfit: number;
  };
  barberDetails?: {
    [barberId: string]: {
      name: string;
      appointments: number;
      grossRevenue: number;
      commission: number;
      advances: number;
      netCommission: number;
    };
  };
}

const ReportsManager = () => {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('all');
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [customDateFrom, setCustomDateFrom] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [customDateTo, setCustomDateTo] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('visible', true)
        .order('name');

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Error loading barbers:', error);
      toast.error('Erro ao carregar barbeiros');
    }
  };

  const getDateRange = () => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (reportPeriod) {
      case 'daily':
        start = startOfDay(today);
        end = endOfDay(today);
        break;
      case 'weekly':
        start = startOfWeek(today, { weekStartsOn: 0 });
        end = endOfWeek(today, { weekStartsOn: 0 });
        break;
      case 'monthly':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'custom':
        if (!customDateFrom || !customDateTo) {
          throw new Error('Selecione as datas para relatório personalizado');
        }
        start = startOfDay(new Date(customDateFrom));
        end = endOfDay(new Date(customDateTo));
        break;
      default:
        start = startOfDay(today);
        end = endOfDay(today);
    }

    return { start, end };
  };

  const loadReportData = async (): Promise<ReportData> => {
    const { start, end } = getDateRange();
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    try {
      // Load appointments with proper error handling
      let appointmentsQuery = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          barber_id,
          service_id,
          client_id
        `)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .in('status', ['completed', 'confirmed']);

      if (selectedBarber !== 'all') {
        appointmentsQuery = appointmentsQuery.eq('barber_id', selectedBarber);
      }

      const { data: appointments, error: appointmentsError } = await appointmentsQuery;
      if (appointmentsError) {
        console.error('Appointments query error:', appointmentsError);
        throw new Error(`Erro ao carregar agendamentos: ${appointmentsError.message}`);
      }

      // Load related data separately to avoid join issues
      let services: any[] = [];
      let barbers: any[] = [];
      let clients: any[] = [];

      if (appointments && appointments.length > 0) {
        // Load services
        const serviceIds = [...new Set(appointments.map((apt: any) => apt.service_id))];
        if (serviceIds.length > 0) {
          const { data: servicesData, error: servicesError } = await supabase
            .from('services')
            .select('id, title, price')
            .in('id', serviceIds);
          
          if (servicesError) {
            console.error('Services query error:', servicesError);
          } else {
            services = servicesData || [];
          }
        }

        // Load barbers
        const barberIds = [...new Set(appointments.map((apt: any) => apt.barber_id))];
        if (barberIds.length > 0) {
          const { data: barbersData, error: barbersError } = await supabase
            .from('barbers')
            .select('id, name')
            .in('id', barberIds);
          
          if (barbersError) {
            console.error('Barbers query error:', barbersError);
          } else {
            barbers = barbersData || [];
          }
        }

        // Load clients
        const clientIds = [...new Set(appointments.map((apt: any) => apt.client_id))];
        if (clientIds.length > 0) {
          const { data: clientsData, error: clientsError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', clientIds);
          
          if (clientsError) {
            console.error('Clients query error:', clientsError);
          } else {
            clients = clientsData || [];
          }
        }
      }

      // Combine data
      const appointmentsWithDetails = (appointments || []).map((apt: any) => ({
        ...apt,
        service: services.find(s => s.id === apt.service_id),
        barber: barbers.find(b => b.id === apt.barber_id),
        client: clients.find(c => c.id === apt.client_id)
      }));

      // Load product sales with proper error handling
      let productSalesQuery = (supabase as any)
        .from('product_sales')
        .select(`
          id,
          barber_id,
          product_id,
          quantity,
          unit_price,
          total_price,
          commission_value,
          sale_date,
          sale_time
        `)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate);

      if (selectedBarber !== 'all') {
        productSalesQuery = productSalesQuery.eq('barber_id', selectedBarber);
      }

      const { data: productSales, error: productSalesError } = await productSalesQuery;
      if (productSalesError) {
        console.error('Product sales query error:', productSalesError);
        throw new Error(`Erro ao carregar vendas de produtos: ${productSalesError.message}`);
      }

      // Load product details separately
      let products: any[] = [];
      if (productSales && productSales.length > 0) {
        const productIds = [...new Set(productSales.map((sale: any) => sale.product_id).filter(Boolean))] as string[];
        if (productIds.length > 0) {
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('id, name')
            .in('id', productIds);
          
          if (productsError) {
            console.error('Products query error:', productsError);
          } else {
            products = productsData || [];
          }
        }
      }

      // Combine product sales with details
      const productSalesWithDetails = (productSales || []).map((sale: any) => ({
        ...sale,
        product: products.find(p => p.id === sale.product_id),
        barber: barbers.find(b => b.id === sale.barber_id)
      }));

      // Load advances with proper error handling
      let advancesQuery = (supabase as any)
        .from('barber_advances')
        .select(`
          id,
          barber_id,
          amount,
          effective_date,
          status,
          description
        `)
        .gte('effective_date', startDate)
        .lte('effective_date', endDate)
        .eq('status', 'approved');

      if (selectedBarber !== 'all') {
        advancesQuery = advancesQuery.eq('barber_id', selectedBarber);
      }

      const { data: advances, error: advancesError } = await advancesQuery;
      if (advancesError) {
        console.error('Advances query error:', advancesError);
        throw new Error(`Erro ao carregar vales: ${advancesError.message}`);
      }

      // Combine advances with barber details
      const advancesWithDetails = (advances || []).map((advance: any) => ({
        ...advance,
        barber: barbers.find(b => b.id === advance.barber_id)
      }));

      // Calculate summary
      const grossRevenue = appointmentsWithDetails.reduce((sum: number, apt: any) => sum + (apt.service?.price || 0), 0) +
                          productSalesWithDetails.reduce((sum: number, sale: any) => sum + sale.total_price, 0);

      const totalCommissions = appointmentsWithDetails.reduce((sum: number, apt: any) => {
        // Simplified commission calculation - you might want to use actual commission data
        return sum + ((apt.service?.price || 0) * 0.5); // Assuming 50% commission
      }, 0) + productSalesWithDetails.reduce((sum: number, sale: any) => sum + sale.commission_value, 0);

      const totalAdvances = advancesWithDetails.reduce((sum: number, adv: any) => sum + adv.amount, 0);
      const barbershopProfit = grossRevenue - totalCommissions;
      const netProfit = barbershopProfit - totalAdvances;

      // Calculate barber details if showing all barbers
      let barberDetails: any = {};
      if (selectedBarber === 'all') {
        const barberIds = [...new Set([
          ...appointmentsWithDetails.map((apt: any) => apt.barber_id),
          ...productSalesWithDetails.map((sale: any) => sale.barber_id)
        ])];

        for (const barberId of barberIds) {
          const barberAppointments = appointmentsWithDetails.filter((apt: any) => apt.barber_id === barberId);
          const barberProductSales = productSalesWithDetails.filter((sale: any) => sale.barber_id === barberId);
          const barberAdvances = advancesWithDetails.filter((adv: any) => adv.barber_id === barberId);

          const barberGrossRevenue = barberAppointments.reduce((sum: number, apt: any) => sum + (apt.service?.price || 0), 0) +
                                    barberProductSales.reduce((sum: number, sale: any) => sum + sale.total_price, 0);

          const barberCommission = barberAppointments.reduce((sum: number, apt: any) => sum + ((apt.service?.price || 0) * 0.5), 0) +
                                  barberProductSales.reduce((sum: number, sale: any) => sum + sale.commission_value, 0);

          const barberAdvancesTotal = barberAdvances.reduce((sum: number, adv: any) => sum + adv.amount, 0);

          barberDetails[barberId] = {
            name: barberAppointments[0]?.barber?.name || barberProductSales[0]?.barber?.name || 'Barbeiro',
            appointments: barberAppointments.length,
            grossRevenue: barberGrossRevenue,
            commission: barberCommission,
            advances: barberAdvancesTotal,
            netCommission: barberCommission - barberAdvancesTotal
          };
        }
      }

      const periodLabel = reportPeriod === 'custom' 
        ? `${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`
        : reportPeriod === 'daily' ? format(start, 'dd/MM/yyyy')
        : reportPeriod === 'weekly' ? `Semana de ${format(start, 'dd/MM/yyyy')}`
        : `${format(start, 'MMMM yyyy', { locale: ptBR })}`;

      return {
        period: periodLabel,
        barberId: selectedBarber !== 'all' ? selectedBarber : undefined,
        barberName: selectedBarber !== 'all' ? barbers.find(b => b.id === selectedBarber)?.name : undefined,
        appointments: appointmentsWithDetails,
        productSales: productSalesWithDetails,
        advances: advancesWithDetails,
        summary: {
          totalAppointments: appointmentsWithDetails.length,
          grossRevenue,
          totalCommissions,
          barbershopProfit,
          totalAdvances,
          netProfit
        },
        barberDetails: selectedBarber === 'all' ? barberDetails : undefined
      };
    } catch (error: any) {
      console.error('Error in loadReportData:', error);
      throw error;
    }
  };

  const generatePDF = async (data: ReportData) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('RELATÓRIO FINANCEIRO', 20, 20);
    doc.text('BARBEARIA RAIMUNDOS', 20, 30);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${data.period}`, 20, 40);
    if (data.barberName) {
      doc.text(`Barbeiro: ${data.barberName}`, 20, 48);
    } else {
      doc.text('Relatório Geral - Todos os Barbeiros', 20, 48);
    }
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 56);

    let yPosition = 70;

    // Summary Section
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('RESUMO GERAL', 20, yPosition);
    yPosition += 10;

    const summaryData = [
      ['Total de Agendamentos', data.summary.totalAppointments.toString()],
      ['Faturamento Bruto', `R$ ${data.summary.grossRevenue.toFixed(2)}`],
      ['Total de Comissões', `R$ ${data.summary.totalCommissions.toFixed(2)}`],
      ['Lucro da Barbearia', `R$ ${data.summary.barbershopProfit.toFixed(2)}`],
      ['Total de Vales', `R$ ${data.summary.totalAdvances.toFixed(2)}`],
      ['Lucro Líquido', `R$ ${data.summary.netProfit.toFixed(2)}`]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Barber Details (if showing all barbers)
    if (data.barberDetails) {
      doc.setFontSize(16);
      doc.text('DETALHES POR BARBEIRO', 20, yPosition);
      yPosition += 10;

      const barberData = Object.values(data.barberDetails).map((barber: any) => [
        barber.name,
        barber.appointments.toString(),
        `R$ ${barber.grossRevenue.toFixed(2)}`,
        `R$ ${barber.commission.toFixed(2)}`,
        `R$ ${barber.advances.toFixed(2)}`,
        `R$ ${barber.netCommission.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Barbeiro', 'Agendamentos', 'Faturamento', 'Comissão', 'Vales', 'Líquido']],
        body: barberData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    // Appointments Details
    if (data.appointments.length > 0) {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.text('DETALHES DOS AGENDAMENTOS', 20, yPosition);
      yPosition += 10;

      const appointmentData = data.appointments.map((apt: any) => [
        format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM/yyyy'),
        apt.appointment_time.slice(0, 5),
        apt.client?.name || 'Cliente',
        apt.service?.title || 'Serviço',
        data.barberName || apt.barber?.name || 'Barbeiro',
        `R$ ${(apt.service?.price || 0).toFixed(2)}`,
        apt.status === 'completed' ? 'Concluído' : 'Confirmado'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Data', 'Hora', 'Cliente', 'Serviço', 'Barbeiro', 'Valor', 'Status']],
        body: appointmentData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 }
      });
    }

    // Save PDF
    const fileName = `relatorio-${reportPeriod}-${data.barberName ? data.barberName.replace(/\s+/g, '-') : 'geral'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  const handleGenerateReport = async () => {
    if (reportPeriod === 'custom' && (!customDateFrom || !customDateTo)) {
      toast.error('Selecione as datas para relatório personalizado');
      return;
    }

    setGenerating(true);
    try {
      const data = await loadReportData();
      await generatePDF(data);
      toast.success('Relatório gerado com sucesso!', {
        description: `${data.summary.totalAppointments} agendamentos • R$ ${data.summary.grossRevenue.toFixed(2)} faturamento`,
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Relatórios Financeiros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Period Selection */}
          <div>
            <Label>Período do Relatório</Label>
            <Select value={reportPeriod} onValueChange={(v) => setReportPeriod(v as any)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Diário (Hoje)
                  </div>
                </SelectItem>
                <SelectItem value="weekly">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Semanal (Esta Semana)
                  </div>
                </SelectItem>
                <SelectItem value="monthly">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Mensal (Este Mês)
                  </div>
                </SelectItem>
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Personalizado
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Barber Selection */}
          <div>
            <Label>Barbeiro</Label>
            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Todos os Barbeiros
                  </div>
                </SelectItem>
                {barbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <Button 
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <TrendingUp className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Gerar PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Custom Date Range */}
        {reportPeriod === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg">
            <div>
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Data Final</Label>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Faturamento Bruto</p>
                  <p className="text-xs text-muted-foreground">Valor total dos serviços</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Lucro da Barbearia</p>
                  <p className="text-xs text-muted-foreground">Faturamento - Comissões</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Comissões dos Barbeiros</p>
                  <p className="text-xs text-muted-foreground">Total pago aos barbeiros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-sm text-muted-foreground bg-secondary/30 p-4 rounded-lg">
          <h4 className="font-medium mb-2">📋 O que inclui o relatório:</h4>
          <ul className="space-y-1 text-xs">
            <li>• <strong>Resumo Geral:</strong> Faturamento bruto, comissões, lucro da barbearia</li>
            <li>• <strong>Detalhes por Barbeiro:</strong> Agendamentos, faturamento individual, comissões</li>
            <li>• <strong>Lista de Agendamentos:</strong> Data, hora, cliente, serviço, valor</li>
            <li>• <strong>Vendas de Produtos:</strong> Produtos vendidos e comissões</li>
            <li>• <strong>Vales e Adiantamentos:</strong> Valores descontados das comissões</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportsManager;