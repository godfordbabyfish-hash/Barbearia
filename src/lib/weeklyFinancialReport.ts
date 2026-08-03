import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface WeeklyServiceLine {
  id: string;
  date: string;
  time: string;
  client: string;
  service: string;
  received: number;
  commission: number;
  payment: string;
}

export interface WeeklyProductLine {
  id: string;
  date: string;
  product: string;
  total: number;
  commission: number;
}

export interface WeeklyAdvanceLine { id: string; date: string; description: string; amount: number }

export interface WeeklyClosureSnapshot {
  version: 1;
  generatedAt: string;
  preview: boolean;
  barber: { id: string; name: string };
  period: { start: string; end: string; year: number; month: number; weekNumber: number };
  services: WeeklyServiceLine[];
  products: WeeklyProductLine[];
  advances: WeeklyAdvanceLine[];
  summary: {
    paidServices: number;
    cancelledAppointments: number;
    serviceRevenue: number;
    productRevenue: number;
    grossRevenue: number;
    serviceCommission: number;
    productCommission: number;
    grossCommission: number;
    advances: number;
    netCommission: number;
    barbershopShare: number;
  };
}

const money = (value: unknown) => Number(value || 0);

export async function buildWeeklyClosureSnapshot(params: {
  barberId: string;
  start: string;
  end: string;
  year: number;
  month: number;
  weekNumber: number;
  preview: boolean;
}): Promise<WeeklyClosureSnapshot> {
  const db = supabase as any;
  const [barberResult, appointmentsResult, productsResult, advancesResult, individualResult, fixedResult] = await Promise.all([
    db.from('barbers').select('id,name').eq('id', params.barberId).single(),
    db.from('appointments').select('id,appointment_date,appointment_time,status,service_id,client_id,client_name,payment_method,original_price,final_price,commission_basis').eq('barber_id', params.barberId).gte('appointment_date', params.start).lte('appointment_date', params.end),
    db.from('product_sales').select('id,sale_date,product_id,total_price,commission_value,status').eq('barber_id', params.barberId).gte('sale_date', params.start).lte('sale_date', params.end).eq('status', 'confirmed'),
    db.from('barber_advances').select('id,effective_date,description,amount,status').eq('barber_id', params.barberId).gte('effective_date', params.start).lte('effective_date', params.end).eq('status', 'approved'),
    db.from('barber_commissions').select('service_id,commission_percentage').eq('barber_id', params.barberId),
    db.from('barber_fixed_commissions').select('service_commission_percentage,product_commission_percentage').eq('barber_id', params.barberId).maybeSingle(),
  ]);

  for (const result of [barberResult, appointmentsResult, productsResult, advancesResult, individualResult, fixedResult]) {
    if (result.error) throw result.error;
  }

  const appointments = appointmentsResult.data || [];
  const completed = appointments.filter((item: any) => item.status === 'completed');
  const appointmentIds = completed.map((item: any) => item.id);
  const serviceIds = [...new Set(completed.map((item: any) => item.service_id).filter(Boolean))];
  const clientIds = [...new Set(completed.map((item: any) => item.client_id).filter(Boolean))];
  const productIds = [...new Set((productsResult.data || []).map((item: any) => item.product_id).filter(Boolean))];

  const [paymentsResult, servicesResult, clientsResult, productNamesResult] = await Promise.all([
    appointmentIds.length ? db.from('appointment_payments').select('appointment_id,amount,payment_method').in('appointment_id', appointmentIds) : Promise.resolve({ data: [], error: null }),
    serviceIds.length ? db.from('services').select('id,title,price').in('id', serviceIds) : Promise.resolve({ data: [], error: null }),
    clientIds.length ? db.from('profiles').select('id,name').in('id', clientIds) : Promise.resolve({ data: [], error: null }),
    productIds.length ? db.from('products').select('id,name').in('id', productIds) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [paymentsResult, servicesResult, clientsResult, productNamesResult]) {
    if (result.error) throw result.error;
  }

  const servicesById = new Map((servicesResult.data || []).map((item: any) => [item.id, item]));
  const clientsById = new Map((clientsResult.data || []).map((item: any) => [item.id, item.name]));
  const productsById = new Map((productNamesResult.data || []).map((item: any) => [item.id, item.name]));
  const commissionByService = new Map((individualResult.data || []).map((item: any) => [item.service_id, money(item.commission_percentage)]));
  const fixedService = money(fixedResult.data?.service_commission_percentage);
  const paymentsByAppointment = new Map<string, any[]>();
  for (const payment of paymentsResult.data || []) {
    const list = paymentsByAppointment.get(payment.appointment_id) || [];
    list.push(payment);
    paymentsByAppointment.set(payment.appointment_id, list);
  }

  const services: WeeklyServiceLine[] = completed.flatMap((appointment: any) => {
    const payments = paymentsByAppointment.get(appointment.id) || [];
    const paidTotal = payments.reduce((sum, item) => sum + money(item.amount), 0);
    const received = money(appointment.final_price) > 0
      ? money(appointment.final_price)
      : paidTotal > 0
        ? paidTotal
        : appointment.payment_method
          ? money(servicesById.get(appointment.service_id)?.price)
          : 0;
    if (received <= 0) return [];
    const original = money(appointment.original_price) || money(servicesById.get(appointment.service_id)?.price);
    const commissionBase = appointment.commission_basis === 'original' ? original : received;
    const percentage = commissionByService.has(appointment.service_id)
      ? money(commissionByService.get(appointment.service_id))
      : fixedService;
    return [{
      id: appointment.id,
      date: appointment.appointment_date,
      time: appointment.appointment_time,
      client: appointment.client_name || clientsById.get(appointment.client_id) || 'Cliente',
      service: servicesById.get(appointment.service_id)?.title || 'Serviço',
      received,
      commission: commissionBase * percentage / 100,
      payment: payments.length ? payments.map((item) => item.payment_method).join(' + ') : appointment.payment_method || 'Registrado',
    }];
  });

  const products: WeeklyProductLine[] = (productsResult.data || []).map((sale: any) => ({
    id: sale.id,
    date: sale.sale_date,
    product: productsById.get(sale.product_id) || 'Produto',
    total: money(sale.total_price),
    commission: money(sale.commission_value),
  }));
  const advances: WeeklyAdvanceLine[] = (advancesResult.data || []).map((advance: any) => ({
    id: advance.id,
    date: advance.effective_date,
    description: advance.description || 'Vale / adiantamento',
    amount: money(advance.amount),
  }));

  const serviceRevenue = services.reduce((sum, item) => sum + item.received, 0);
  const productRevenue = products.reduce((sum, item) => sum + item.total, 0);
  const serviceCommission = services.reduce((sum, item) => sum + item.commission, 0);
  const productCommission = products.reduce((sum, item) => sum + item.commission, 0);
  const advanceTotal = advances.reduce((sum, item) => sum + item.amount, 0);
  const grossRevenue = serviceRevenue + productRevenue;
  const grossCommission = serviceCommission + productCommission;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    preview: params.preview,
    barber: barberResult.data,
    period: { start: params.start, end: params.end, year: params.year, month: params.month, weekNumber: params.weekNumber },
    services,
    products,
    advances,
    summary: {
      paidServices: services.length,
      cancelledAppointments: appointments.filter((item: any) => item.status === 'cancelled').length,
      serviceRevenue,
      productRevenue,
      grossRevenue,
      serviceCommission,
      productCommission,
      grossCommission,
      advances: advanceTotal,
      netCommission: grossCommission - advanceTotal,
      barbershopShare: grossRevenue - grossCommission,
    },
  };
}

const brl = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const dateBR = (value: string) => value.split('-').reverse().join('/');

export function downloadWeeklyClosurePdf(snapshot: WeeklyClosureSnapshot, saved: boolean) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(saved ? 'FECHAMENTO FINANCEIRO SEMANAL' : 'PRÉVIA DO FECHAMENTO SEMANAL', 14, 18);
  doc.setFontSize(11);
  doc.text(`Barbeiro: ${snapshot.barber.name}`, 14, 27);
  doc.text(`Semana ${snapshot.period.weekNumber}: ${dateBR(snapshot.period.start)} a ${dateBR(snapshot.period.end)}`, 14, 34);
  doc.text(saved ? `Fechado em: ${new Date(snapshot.generatedAt).toLocaleString('pt-BR')}` : 'Documento parcial — ainda não é um fechamento definitivo.', 14, 41);

  autoTable(doc, {
    startY: 48,
    head: [['Resumo', 'Valor']],
    body: [
      ['Serviços concluídos e pagos', String(snapshot.summary.paidServices)],
      ['Receita de serviços', brl(snapshot.summary.serviceRevenue)],
      ['Receita de produtos', brl(snapshot.summary.productRevenue)],
      ['Comissão bruta', brl(snapshot.summary.grossCommission)],
      ['Vales aprovados', brl(snapshot.summary.advances)],
      ['Comissão líquida', brl(snapshot.summary.netCommission)],
      ['Parte da barbearia', brl(snapshot.summary.barbershopShare)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 180, 30] },
  });
  let y = (doc as any).lastAutoTable.finalY + 9;
  if (snapshot.services.length) {
    doc.text('Serviços', 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [['Data', 'Cliente', 'Serviço', 'Recebido', 'Comissão']],
      body: snapshot.services.map((item) => [dateBR(item.date), item.client, item.service, brl(item.received), brl(item.commission)]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [35, 35, 35] },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  }
  if (snapshot.advances.length) {
    doc.text('Vales / adiantamentos aprovados', 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [['Data', 'Descrição', 'Valor']],
      body: snapshot.advances.map((item) => [dateBR(item.date), item.description, brl(item.amount)]),
      headStyles: { fillColor: [35, 35, 35] },
    });
  }
  const prefix = saved ? 'fechamento' : 'previa';
  doc.save(`${prefix}-${snapshot.barber.name.toLowerCase().replace(/\s+/g, '-')}-${snapshot.period.start}.pdf`);
}
