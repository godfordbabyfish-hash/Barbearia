# PDF Reports System Fix - Requirements

## Overview
Fix the PDF report generation system in the admin dashboard that is currently failing due to dependency and implementation issues.

## Current Issues
1. **PDF Generation Error**: `doc.autoTable is not a function` - indicating improper import/usage of jspdf-autotable
2. **Database Query Errors**: 400 status errors when fetching appointment data with complex joins
3. **Missing Error Handling**: Poor error handling for failed report generation
4. **Dependency Version Conflicts**: Potential version compatibility issues between jsPDF and jspdf-autotable

## User Stories

### US1: Admin Report Generation
**As an** admin/gestor  
**I want to** generate PDF reports for daily, weekly, monthly, and custom periods  
**So that** I can analyze the barbershop's financial performance and make informed business decisions

**Acceptance Criteria:**
- AC1.1: Admin can select report period (daily/weekly/monthly/custom)
- AC1.2: Admin can filter reports by specific barber or view all barbers
- AC1.3: PDF is generated successfully without errors
- AC1.4: PDF contains comprehensive financial data with proper formatting
- AC1.5: Success notification is shown when PDF is generated
- AC1.6: Error messages are clear and actionable when generation fails

### US2: Comprehensive Financial Data
**As an** admin  
**I want to** see detailed financial breakdowns in the PDF report  
**So that** I can understand revenue, commissions, and profits accurately

**Acceptance Criteria:**
- AC2.1: Report shows gross revenue (faturamento bruto)
- AC2.2: Report shows total commissions paid to barbers
- AC2.3: Report shows barbershop profit (lucro da barbearia)
- AC2.4: Report shows individual barber performance when viewing all barbers
- AC2.5: Report includes appointment details (date, time, client, service, value)
- AC2.6: Report includes product sales data and commissions
- AC2.7: Report includes advances/vales deducted from commissions
- AC2.8: All monetary values are formatted correctly in Brazilian Real (R$)

### US3: Reliable Data Fetching
**As a** system  
**I need to** fetch appointment and financial data reliably  
**So that** reports contain accurate and complete information

**Acceptance Criteria:**
- AC3.1: Database queries handle complex relationships without join errors
- AC3.2: Missing or null data is handled gracefully
- AC3.3: Query performance is optimized for large datasets
- AC3.4: Proper error handling for database connection issues
- AC3.5: Data validation ensures report accuracy

### US4: Professional PDF Output
**As an** admin  
**I want to** receive a professionally formatted PDF report  
**So that** I can share it with stakeholders or keep it for records

**Acceptance Criteria:**
- AC4.1: PDF has proper header with barbershop name and logo
- AC4.2: PDF includes report period and generation timestamp
- AC4.3: Tables are properly formatted with headers and borders
- AC4.4: Data is organized in logical sections (summary, barber details, appointments)
- AC4.5: PDF filename includes period and barber information
- AC4.6: PDF is automatically downloaded to user's device

## Technical Requirements

### TR1: Dependency Management
- Fix jsPDF and jspdf-autotable integration
- Ensure proper TypeScript types are available
- Update dependencies to compatible versions if needed

### TR2: Database Query Optimization
- Separate complex joins into individual queries
- Implement proper error handling for each query
- Add data validation and null checks

### TR3: Error Handling
- Implement comprehensive try-catch blocks
- Provide meaningful error messages to users
- Log detailed errors for debugging
- Graceful degradation when partial data is available

### TR4: Performance
- Optimize database queries for large date ranges
- Implement loading states during report generation
- Consider pagination for very large datasets

## Business Rules

### BR1: Financial Calculations
- Commission calculations should match the system's commission structure
- Advances/vales should be properly deducted from net commissions
- All monetary calculations should be accurate to 2 decimal places

### BR2: Data Access
- Only admin/gestor users should have access to financial reports
- Reports should respect user permissions and data access rules

### BR3: Report Periods
- Daily reports show current day data
- Weekly reports show current week (Sunday to Saturday)
- Monthly reports show current month
- Custom reports allow any date range selection

## Non-Functional Requirements

### NFR1: Usability
- Report generation should complete within 30 seconds for typical datasets
- Clear progress indicators during generation
- Intuitive interface for period and barber selection

### NFR2: Reliability
- System should handle network interruptions gracefully
- PDF generation should work consistently across different browsers
- Error recovery mechanisms for failed generations

### NFR3: Maintainability
- Code should be well-documented and modular
- Separate concerns (data fetching, PDF generation, UI)
- Easy to extend for new report types or formats

## Success Metrics
- PDF reports generate successfully 99% of the time
- Report generation completes within 15 seconds on average
- Zero database query errors during report generation
- User satisfaction with report content and formatting