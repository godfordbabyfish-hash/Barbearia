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
      serviceCommissions: number;
      productCommissions: number;
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
  const [recalculatingProducts, setRecalculatingProducts] = useState(false);

  const parseLocalISODate = (iso: string): Date => {
    try {
      const [y, m, d] = iso.split('-').map((v) => parseInt(v, 10));
      if (!y || !m || !d) return new Date();
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    } catch {
      return new Date();
    }
  };

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
        start = startOfDay(parseLocalISODate(customDateFrom));
        end = endOfDay(parseLocalISODate(customDateTo));
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
      appointmentsWithDetails.sort((a: any, b: any) => {
        if (a.appointment_date !== b.appointment_date) {
          return a.appointment_date.localeCompare(b.appointment_date);
        }
        return a.appointment_time.localeCompare(b.appointment_time);
      });

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
      productSalesWithDetails.sort((a: any, b: any) => {
        if (a.sale_date !== b.sale_date) {
          return a.sale_date.localeCompare(b.sale_date);
        }
        return a.sale_time.localeCompare(b.sale_time);
      });

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
      advancesWithDetails.sort((a: any, b: any) => {
        return a.effective_date.localeCompare(b.effective_date);
      });

      // Calculate summary
      const grossRevenue =
        appointmentsWithDetails.reduce((sum: number, apt: any) => sum + (apt.service?.price || 0), 0) +
        productSalesWithDetails.reduce((sum: number, sale: any) => sum + sale.total_price, 0);

      const serviceCommissions = appointmentsWithDetails.reduce((sum: number, apt: any) => {
        return sum + (apt.service?.price || 0) * 0.5;
      }, 0);

      const productCommissions = productSalesWithDetails.reduce(
        (sum: number, sale: any) => sum + sale.commission_value,
        0
      );

      const totalCommissions = serviceCommissions + productCommissions;

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
          serviceCommissions,
          productCommissions,
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

    const primaryColor = [255, 191, 77];
    const secondaryColor = [18, 18, 18];
    const mutedTextColor = [80, 80, 80];

    // Header
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, 0, 210, 26, 'F');

    let titleX = 20;
    try {
      const img = new Image();
      img.src = '/icon-192.png';
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const ratio = img.width && img.height ? img.width / img.height : 1;
          const logoHeight = 10;
          const logoWidth = logoHeight * ratio;
          doc.addImage(img, 'PNG', 20, 8, logoWidth, logoHeight);
          titleX = 20 + logoWidth + 4;
          resolve();
        };
        img.onerror = () => resolve();
      });
    } catch {
      titleX = 20;
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('BARBEARIA RAIMUNDOS', titleX, 16);

    doc.setFontSize(9);
    doc.text('Relatório financeiro', titleX, 22);

    doc.setFontSize(8);
    doc.setTextColor(230, 240, 250);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 150, 22, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    let metaY = 34;
    doc.text(`Período: ${data.period}`, 20, metaY);
    metaY += 5;
    if (data.barberName) {
      doc.text(`Barbeiro: ${data.barberName}`, 20, metaY);
    } else {
      doc.text('Visão: geral - todos os barbeiros', 20, metaY);
    }

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.line(20, metaY + 4, 190, metaY + 4);

    let yPosition = metaY + 14;

    // Summary Section
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Resumo geral', 20, yPosition);
    yPosition += 10;

    const isBarbershopReport = !data.barberId;
    const gross = data.summary.grossRevenue;
    const totalCom = data.summary.totalCommissions;
    const serviceCom = data.summary.serviceCommissions;
    const productCom = data.summary.productCommissions;
    const barbershopProfit = data.summary.barbershopProfit;
    const totalAdvances = data.summary.totalAdvances;
    const net = data.summary.netProfit;

    const commissionRate = gross > 0 ? (totalCom / gross) * 100 : 0;
    const profitMargin = gross > 0 ? (barbershopProfit / gross) * 100 : 0;
    const roi = gross > 0 ? (net / gross) * 100 : 0;

    const barberNetCommission = totalCom - totalAdvances;
    const barbershopShareFromBarber = gross - totalCom;

    const summaryData = isBarbershopReport
      ? [
          ['Agendamentos no período', data.summary.totalAppointments.toString()],
          ['Fat. bruto (serviços + produtos)', `R$ ${gross.toFixed(2)}`],
          ['Comissão serviços (todos barbeiros)', `R$ ${serviceCom.toFixed(2)}`],
          ['Comissão produtos (todos barbeiros)', `R$ ${productCom.toFixed(2)}`],
          ['Total comissões (serv. + prod.)', `R$ ${totalCom.toFixed(2)}`],
          ['Comissões / faturamento', `${commissionRate.toFixed(2)}%`],
          ['Lucro antes de vales (fat. - comissões)', `R$ ${barbershopProfit.toFixed(2)}`],
          ['Margem de lucro', `${profitMargin.toFixed(2)}%`],
          ['Vales / adiantamentos (todos barbeiros)', `R$ ${totalAdvances.toFixed(2)}`],
          ['Lucro líquido (lucro - vales)', `R$ ${net.toFixed(2)}`],
          ['ROI (lucro líquido / faturamento)', `${roi.toFixed(2)}%`],
        ]
      : [
          ['Agendamentos do barbeiro no período', data.summary.totalAppointments.toString()],
          ['Faturamento (serviços + produtos)', `R$ ${gross.toFixed(2)}`],
          ['Comissão serviços do barbeiro', `R$ ${serviceCom.toFixed(2)}`],
          ['Comissão produtos do barbeiro', `R$ ${productCom.toFixed(2)}`],
          ['Comissão bruta (serv. + prod.)', `R$ ${totalCom.toFixed(2)}`],
          ['Parte da barbearia (fat. - comissão bruta)', `R$ ${barbershopShareFromBarber.toFixed(2)}`],
          ['Vales / adiantamentos no período', `R$ ${totalAdvances.toFixed(2)}`],
          ['Comissão líquida (bruta - vales)', `R$ ${barberNetCommission.toFixed(2)}`],
        ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2, textColor: mutedTextColor },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 60, halign: 'right', textColor: secondaryColor }
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body') {
          const label = String(hookData.row.raw?.[0] || '');

          if (!isBarbershopReport) {
            if (label.startsWith('Faturamento (serviços + produtos)')) {
              hookData.cell.styles.fillColor = [220, 235, 252];
            } else if (
              label.startsWith('Comissão serviços do barbeiro') ||
              label.startsWith('Comissão produtos do barbeiro')
            ) {
              hookData.cell.styles.fillColor = [220, 247, 223];
            } else if (label.startsWith('Comissão bruta (serv. + prod.)')) {
              hookData.cell.styles.fillColor = [208, 240, 192];
            } else if (label.startsWith('Parte da barbearia')) {
              hookData.cell.styles.fillColor = [252, 243, 207];
            } else if (label.startsWith('Vales / adiantamentos no período')) {
              hookData.cell.styles.fillColor = [252, 228, 214];
            } else if (label.startsWith('Comissão líquida (bruta - vales)')) {
              hookData.cell.styles.fillColor = [199, 230, 204];
              hookData.cell.styles.fontStyle = 'bold';
            }
          } else {
            if (label.startsWith('Fat. bruto (serviços + produtos)')) {
              hookData.cell.styles.fillColor = [220, 235, 252];
            } else if (
              label.startsWith('Comissão serviços (todos barbeiros)') ||
              label.startsWith('Comissão produtos (todos barbeiros)')
            ) {
              hookData.cell.styles.fillColor = [220, 247, 223];
            } else if (label.startsWith('Total comissões (serv. + prod.)')) {
              hookData.cell.styles.fillColor = [208, 240, 192];
            } else if (label.startsWith('Lucro antes de vales')) {
              hookData.cell.styles.fillColor = [208, 240, 192];
            } else if (label.startsWith('Vales / adiantamentos (todos barbeiros)')) {
              hookData.cell.styles.fillColor = [252, 228, 214];
            } else if (label.startsWith('Lucro líquido (lucro - vales)')) {
              hookData.cell.styles.fillColor = [199, 230, 204];
              hookData.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Barber Details (if showing all barbers)
    if (data.barberDetails) {
      doc.setFontSize(11);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Detalhes por barbeiro', 20, yPosition);
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
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    // Appointments Details (Relatório de Serviços)
    if (data.appointments.length > 0) {
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Relatório de serviços - detalhes dos agendamentos', 20, yPosition);
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
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: {
          5: { halign: 'right' }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    // Product Sales Details (Relatório de Produtos)
    if (data.productSales.length > 0) {
      if (yPosition > 230 || !data.appointments.length) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Relatório de produtos - vendas de produtos', 20, yPosition);
      yPosition += 10;

      const productData = data.productSales.map((sale: any) => [
        format(new Date(sale.sale_date + 'T00:00:00'), 'dd/MM/yyyy'),
        (sale.sale_time || '').slice(0, 5),
        sale.product?.name || 'Produto',
        data.barberName || sale.barber?.name || 'Barbeiro',
        sale.quantity?.toString() || '1',
        `R$ ${Number(sale.total_price || 0).toFixed(2)}`,
        `R$ ${Number(sale.commission_value || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Data', 'Hora', 'Produto', 'Barbeiro', 'Qtd', 'Total', 'Comissão']],
        body: productData,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: {
          4: { halign: 'center' },
          5: { halign: 'right' },
          6: { halign: 'right' }
        }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    if (yPosition > 230) {
      doc.addPage();
      yPosition = 30;
    }

    doc.setFontSize(11);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Termo de ciência e concordância', 20, yPosition);
    yPosition += 8;

    const termText =
      'Declaro que conferi as informações deste relatório e que os valores de serviços, produtos, comissões, vales e total líquido aqui apresentados estão corretos e de acordo com o combinado com a Barbearia Raimundos.';

    doc.setFontSize(8);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    const termLines = doc.splitTextToSize(termText, 170);
    doc.text(termLines, 20, yPosition);
    yPosition += termLines.length * 4 + 10;

    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Assinatura do barbeiro: _______________________________________', 20, yPosition);
    yPosition += 8;
    doc.text('Data: ____/____/________', 20, yPosition);

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Página ${i} de ${pageCount}`, 200, 290, { align: 'right' });
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

  const handleRecalculateProductCommissions = async () => {
    try {
      setRecalculatingProducts(true);

      let salesQuery = supabase
        .from('product_sales')
        .select('id, barber_id, product_id, total_price, status')
        .eq('status', 'confirmed');

      if (selectedBarber !== 'all') {
        salesQuery = salesQuery.eq('barber_id', selectedBarber);
      }

      const { data: sales, error: salesError } = await salesQuery;
      if (salesError) {
        throw new Error('Erro ao carregar vendas de produtos para recalcular comissões');
      }

      if (!sales || sales.length === 0) {
        toast.info('Nenhuma venda de produto confirmada encontrada para este barbeiro/histórico.');
        return;
      }

      const barberIds = Array.from(new Set((sales as any[]).map((s) => s.barber_id).filter(Boolean)));

      let individualCommissions: any[] = [];
      let fixedCommissions: any[] = [];

      if (barberIds.length > 0) {
        const { data: individualData, error: individualError } = await supabase
          .from('barber_product_commissions')
          .select('barber_id, product_id, commission_percentage')
          .in('barber_id', barberIds);

        if (individualError) {
          throw new Error('Erro ao carregar comissões individuais de produtos');
        }

        individualCommissions = individualData || [];

        const { data: fixedData, error: fixedError } = await supabase
          .from('barber_fixed_commissions')
          .select('barber_id, product_commission_percentage')
          .in('barber_id', barberIds);

        if (fixedError) {
          throw new Error('Erro ao carregar comissões fixas de produtos');
        }

        fixedCommissions = fixedData || [];
      }

      for (const sale of sales as any[]) {
        const existingTotal = Number(sale.total_price || 0);
        const individual = individualCommissions.find(
          (c) => c.barber_id === sale.barber_id && c.product_id === sale.product_id
        )?.commission_percentage || 0;

        const fixed = fixedCommissions.find(
          (c) => c.barber_id === sale.barber_id
        )?.product_commission_percentage || 0;

        const commissionPercentage = individual > 0 ? individual : fixed;
        const commissionValue = (existingTotal * commissionPercentage) / 100;

        const { error: updateError } = await supabase
          .from('product_sales')
          .update({
            commission_percentage: commissionPercentage,
            commission_value: commissionValue,
          })
          .eq('id', sale.id);

        if (updateError) {
          throw new Error('Erro ao atualizar comissões de vendas de produtos');
        }
      }

      toast.success('Comissões de produtos recalculadas com sucesso para todo o histórico selecionado!');
    } catch (error: any) {
      console.error('Error recalculating product commissions:', error);
      toast.error(error.message || 'Erro ao recalcular comissões de produtos');
    } finally {
      setRecalculatingProducts(false);
    }
  };

  return (
    <Card className="bg-card border-border shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Relatórios Financeiros
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Period Selection */}
            <div>
              <Label className="text-sm">Período do Relatório</Label>
              <Select value={reportPeriod} onValueChange={(v) => setReportPeriod(v as any)}>
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">Diário (Hoje)</span>
                      <span className="sm:hidden">Hoje</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">Semanal (Esta Semana)</span>
                      <span className="sm:hidden">Semana</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">Mensal (Este Mês)</span>
                      <span className="sm:hidden">Mês</span>
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
              <Label className="text-sm">Barbeiro</Label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Todos os Barbeiros</span>
                      <span className="sm:hidden">Todos</span>
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

            <div className="flex flex-col items-stretch gap-2">
              <Button 
                onClick={handleGenerateReport}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Gerando...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Gerar PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </>
                )}
              </Button>
              <Button
                onClick={handleRecalculateProductCommissions}
                disabled={recalculatingProducts}
                variant="outline"
                className="w-full text-xs sm:text-sm"
              >
                {recalculatingProducts ? 'Recalculando comissões...' : 'Recalcular comissões de produtos'}
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          {reportPeriod === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-secondary/30 rounded-lg">
              <div>
                <Label className="text-sm">Data Inicial</Label>
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="mt-2 w-full"
                />
              </div>
              <div>
                <Label className="text-sm">Data Final</Label>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="mt-2 w-full"
                />
              </div>
            </div>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Faturamento Bruto</p>
                    <p className="text-xs text-muted-foreground">Valor total dos serviços</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Lucro da Barbearia</p>
                    <p className="text-xs text-muted-foreground">Faturamento - Comissões</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Comissões dos Barbeiros</p>
                    <p className="text-xs text-muted-foreground">Total pago aos barbeiros</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-sm text-muted-foreground bg-secondary/30 p-3 sm:p-4 rounded-lg">
            <h4 className="font-medium mb-2">📋 O que inclui o relatório:</h4>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Resumo Geral:</strong> Faturamento bruto, comissões, lucro da barbearia</li>
              <li>• <strong>Detalhes por Barbeiro:</strong> Agendamentos, faturamento individual, comissões</li>
              <li>• <strong>Lista de Agendamentos:</strong> Data, hora, cliente, serviço, valor</li>
              <li>• <strong>Vendas de Produtos:</strong> Produtos vendidos e comissões</li>
              <li>• <strong>Vales e Adiantamentos:</strong> Valores descontados das comissões</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportsManager;
