import React from 'react';
import { Layout } from '@/components/Layout';
import { ProcessStagesSummaryReport } from '@/components/reports/ProcessStagesSummaryReport';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users } from 'lucide-react';

export default function SupervisorProcessStagesSummaryReport() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/supervisor">Supervisor Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Process Stages Summary</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Process Stages Summary</h1>
            <p className="text-muted-foreground">
              Monitor your team's production flow across all process stages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Overview</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Your Team</div>
              <p className="text-xs text-muted-foreground">
                Track your supervised employees' progress
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Real-time Data</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Live Updates</div>
              <p className="text-xs text-muted-foreground">
                Work entries and process stages
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Export Options</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">PDF & Excel</div>
              <p className="text-xs text-muted-foreground">
                Download team performance reports
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Report Component */}
        <ProcessStagesSummaryReport
          showFilters={true}
          showExport={true}
          showPrint={true}
          autoRefresh={true}
          refreshInterval={30000}
        />
      </div>
    </Layout>
  );
}
