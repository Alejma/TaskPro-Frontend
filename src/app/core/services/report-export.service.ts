import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DashboardMetrics, ProjectSummary } from '../../features/dashboard/dashboard.service';

export type ReportFormat = 'pdf' | 'excel';

export interface ReportExportOptions {
  metrics: DashboardMetrics;
  projectId: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  format: ReportFormat;
}

interface ReportSnapshot {
  scope: string;
  metrics: DashboardMetrics;
  projects: ProjectSummary[];
}

@Injectable({ providedIn: 'root' })
export class ReportExportService {
  export(options: ReportExportOptions): void {
    const snapshot = this.buildSnapshot(options);

    if (options.format === 'pdf') {
      this.exportPdf(snapshot, options);
      return;
    }

    this.exportExcel(snapshot, options);
  }

  private buildSnapshot(options: ReportExportOptions): ReportSnapshot {
    const { metrics, projectId, projectName } = options;

    if (projectId === 'all') {
      return { scope: 'Reporte general', metrics, projects: metrics.projects };
    }

    const project = metrics.projects.find((item) => String(item.id) === projectId);
    if (!project) {
      return { scope: projectName, metrics, projects: [] };
    }

    const scopedMetrics: DashboardMetrics = {
      ...metrics,
      totalProjects: 1,
      activeProjects: project.status === 'ACTIVE' ? 1 : 0,
      totalTasks: project.totalTasks,
      pendingTasks: project.pendingTasks,
      inProgressTasks: project.inProgressTasks,
      completedTasks: project.completedTasks,
      completionRate: project.progress,
      projects: [project]
    };

    return { scope: project.name, metrics: scopedMetrics, projects: [project] };
  }

  private exportPdf(snapshot: ReportSnapshot, options: ReportExportOptions): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('TaskPro - Reporte de indicadores', margin, y);

    y += 24;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Alcance: ${snapshot.scope}`, margin, y);
    y += 16;
    doc.text(`Periodo: ${this.formatDate(options.startDate)} - ${this.formatDate(options.endDate)}`, margin, y);
    y += 16;
    doc.text(`Generado: ${this.formatDateTime(new Date())}`, margin, y);
    y += 24;

    autoTable(doc, {
      startY: y,
      head: [['Indicador', 'Valor']],
      body: this.buildIndicatorRows(snapshot.metrics),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [39, 42, 54] },
      margin: { left: margin, right: margin }
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

    if (snapshot.projects.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Detalle por proyecto', margin, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [['Proyecto', 'Estado', 'Total', 'Pend.', 'Prog.', 'Comp.', 'Avance %']],
        body: snapshot.projects.map((project) => [
          project.name,
          project.status,
          String(project.totalTasks),
          String(project.pendingTasks),
          String(project.inProgressTasks),
          String(project.completedTasks),
          `${project.progress}%`
        ]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [95, 75, 144] },
        margin: { left: margin, right: margin }
      });

      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
    }

    const priorityRows = Object.entries(snapshot.metrics.tasksByPriority ?? {});
    if (priorityRows.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Tareas por prioridad', margin, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [['Prioridad', 'Cantidad']],
        body: priorityRows.map(([label, count]) => [label, String(count)]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [129, 138, 163] },
        margin: { left: margin, right: margin }
      });
    }

    doc.save(this.buildFileName(options, 'pdf'));
  }

  private exportExcel(snapshot: ReportSnapshot, options: ReportExportOptions): void {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['TaskPro - Reporte de indicadores'],
      ['Alcance', snapshot.scope],
      ['Periodo', `${this.formatDate(options.startDate)} - ${this.formatDate(options.endDate)}`],
      ['Generado', this.formatDateTime(new Date())],
      [],
      ['Indicador', 'Valor'],
      ...this.buildIndicatorRows(snapshot.metrics)
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    if (snapshot.projects.length > 0) {
      const projectsSheet = XLSX.utils.json_to_sheet(
        snapshot.projects.map((project) => ({
          Proyecto: project.name,
          Estado: project.status,
          Total: project.totalTasks,
          Pendientes: project.pendingTasks,
          'En progreso': project.inProgressTasks,
          Completadas: project.completedTasks,
          'Avance %': project.progress
        }))
      );
      XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Proyectos');
    }

    const priorityRows = Object.entries(snapshot.metrics.tasksByPriority ?? {});
    if (priorityRows.length > 0) {
      const prioritySheet = XLSX.utils.aoa_to_sheet([
        ['Prioridad', 'Cantidad'],
        ...priorityRows.map(([label, count]) => [label, count])
      ]);
      XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Prioridades');
    }

    XLSX.writeFile(workbook, this.buildFileName(options, 'xlsx'));
  }

  private buildIndicatorRows(metrics: DashboardMetrics): string[][] {
    return [
      ['Proyectos totales', String(metrics.totalProjects)],
      ['Proyectos activos', String(metrics.activeProjects)],
      ['Total tareas', String(metrics.totalTasks)],
      ['Tareas pendientes', String(metrics.pendingTasks)],
      ['Tareas en progreso', String(metrics.inProgressTasks)],
      ['Tareas completadas', String(metrics.completedTasks)],
      ['Tareas vencidas', String(metrics.overdueTasks)],
      ['Completadas esta semana', String(metrics.completedThisWeek)],
      ['Creadas esta semana', String(metrics.createdThisWeek)],
      ['Prioridad promedio', String(metrics.averagePriority)],
      ['Tasa de finalización (%)', String(metrics.completionRate)],
      ['Progreso por peso (%)', String(metrics.weightProgress)],
      ['Peso completado', `${metrics.completedWeight}/${metrics.totalWeight}`]
    ];
  }

  private buildFileName(options: ReportExportOptions, extension: 'pdf' | 'xlsx'): string {
    const scope = options.projectId === 'all' ? 'general' : this.slugify(options.projectName);
    const from = this.formatFileDate(options.startDate);
    const to = this.formatFileDate(options.endDate);
    return `taskpro-reporte-${scope}-${from}_${to}.${extension}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatFileDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'proyecto';
  }
}
