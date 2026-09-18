export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'lease' | 'agreement' | 'notice' | 'form' | 'other';
  content: string;
  variables: TemplateVariable[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
  tags: string[];
}

export interface GeneratedDocument {
  id: string;
  templateId: string;
  variables: Record<string, any>;
  content: string;
  pdfUrl?: string;
  createdAt: Date;
  createdBy: string;
  status: 'draft' | 'generated' | 'signed' | 'expired';
}

export class DocumentTemplateManager {
  private templates: DocumentTemplate[] = [];
  private generatedDocuments: GeneratedDocument[] = [];

  constructor() {
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates() {
    this.templates = [
      {
        id: 'residential-lease',
        name: 'Residential Lease Agreement',
        description: 'Standard residential lease agreement template',
        category: 'lease',
        content: this.getResidentialLeaseTemplate(),
        variables: [
          { name: 'landlordName', label: 'Landlord Name', type: 'text', required: true },
          { name: 'tenantName', label: 'Tenant Name', type: 'text', required: true },
          { name: 'propertyAddress', label: 'Property Address', type: 'text', required: true },
          { name: 'monthlyRent', label: 'Monthly Rent', type: 'currency', required: true },
          { name: 'securityDeposit', label: 'Security Deposit', type: 'currency', required: true },
          { name: 'leaseTerm', label: 'Lease Term (months)', type: 'number', required: true, validation: { min: 1, max: 60 } },
          { name: 'startDate', label: 'Lease Start Date', type: 'date', required: true },
          { name: 'endDate', label: 'Lease End Date', type: 'date', required: true },
          { name: 'petAllowed', label: 'Pets Allowed', type: 'boolean', required: true },
          { name: 'smokingAllowed', label: 'Smoking Allowed', type: 'boolean', required: true },
          { name: 'lateFee', label: 'Late Fee', type: 'currency', required: false },
          { name: 'utilitiesIncluded', label: 'Utilities Included', type: 'select', required: false, options: ['None', 'Water', 'Electric', 'Gas', 'All'] }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        isPublic: true,
        tags: ['lease', 'residential', 'standard']
      },
      {
        id: 'roommate-agreement',
        name: 'Roommate Agreement',
        description: 'Roommate living agreement template',
        category: 'agreement',
        content: this.getRoommateAgreementTemplate(),
        variables: [
          { name: 'tenant1Name', label: 'Tenant 1 Name', type: 'text', required: true },
          { name: 'tenant2Name', label: 'Tenant 2 Name', type: 'text', required: true },
          { name: 'propertyAddress', label: 'Property Address', type: 'text', required: true },
          { name: 'monthlyRent', label: 'Monthly Rent per Person', type: 'currency', required: true },
          { name: 'securityDeposit', label: 'Security Deposit per Person', type: 'currency', required: true },
          { name: 'leaseTerm', label: 'Agreement Term (months)', type: 'number', required: true },
          { name: 'startDate', label: 'Agreement Start Date', type: 'date', required: true },
          { name: 'houseRules', label: 'House Rules', type: 'text', required: false },
          { name: 'choresSchedule', label: 'Chores Schedule', type: 'text', required: false }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        isPublic: true,
        tags: ['roommate', 'agreement', 'shared']
      },
      {
        id: 'notice-to-vacate',
        name: 'Notice to Vacate',
        description: 'Tenant notice to vacate template',
        category: 'notice',
        content: this.getNoticeToVacateTemplate(),
        variables: [
          { name: 'landlordName', label: 'Landlord Name', type: 'text', required: true },
          { name: 'tenantName', label: 'Tenant Name', type: 'text', required: true },
          { name: 'propertyAddress', label: 'Property Address', type: 'text', required: true },
          { name: 'vacateDate', label: 'Vacate Date', type: 'date', required: true },
          { name: 'noticeDate', label: 'Notice Date', type: 'date', required: true },
          { name: 'reason', label: 'Reason for Leaving', type: 'select', required: false, options: ['New Job', 'Buying Home', 'Relocation', 'Personal', 'Other'] }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        isPublic: true,
        tags: ['notice', 'vacate', 'tenant']
      }
    ];
  }

  private getResidentialLeaseTemplate(): string {
    return `
RESIDENTIAL LEASE AGREEMENT

This Lease Agreement is made and entered into on {{startDate}} by and between:

LANDLORD: {{landlordName}}
TENANT: {{tenantName}}

PROPERTY: {{propertyAddress}}

TERM: This lease shall begin on {{startDate}} and end on {{endDate}} ({{leaseTerm}} months).

RENT: Tenant shall pay Landlord the sum of \${{monthlyRent}} per month, due on the 1st day of each month.

SECURITY DEPOSIT: Tenant has paid a security deposit of \${{securityDeposit}}, which shall be returned within 30 days of lease termination, less any deductions for damages.

UTILITIES: {{utilitiesIncluded}} utilities are included in the rent.

PETS: {{#petAllowed}}Pets are allowed with written permission.{{/petAllowed}}{{^petAllowed}}No pets are allowed.{{/petAllowed}}

SMOKING: {{#smokingAllowed}}Smoking is permitted in designated areas only.{{/smokingAllowed}}{{^smokingAllowed}}No smoking is permitted on the premises.{{/smokingAllowed}}

LATE FEES: {{#lateFee}}A late fee of \${{lateFee}} will be charged for rent received after the 5th day of the month.{{/lateFee}}

This lease constitutes the entire agreement between the parties. No modifications shall be binding unless in writing and signed by both parties.

_________________________        _________________________
Landlord Signature          Tenant Signature

Date: {{currentDate}}        Date: {{currentDate}}
    `.trim();
  }

  private getRoommateAgreementTemplate(): string {
    return `
ROOMMATE AGREEMENT

This Roommate Agreement is made on {{startDate}} between:

TENANT 1: {{tenant1Name}}
TENANT 2: {{tenant2Name}}

PROPERTY: {{propertyAddress}}

TERM: This agreement shall remain in effect for {{leaseTerm}} months beginning {{startDate}}.

RENT: Each tenant shall pay \${{monthlyRent}} per month for their share of the rent.

SECURITY DEPOSIT: Each tenant has paid a security deposit of \${{securityDeposit}}.

HOUSE RULES:
{{houseRules}}

CHORES SCHEDULE:
{{choresSchedule}}

EXPENSES: All utilities and shared expenses shall be divided equally between roommates.

TERMINATION: Either roommate may terminate this agreement with 30 days written notice.

This agreement represents the entire understanding between the roommates.

_________________________        _________________________
Tenant 1 Signature          Tenant 2 Signature

Date: {{currentDate}}        Date: {{currentDate}}
    `.trim();
  }

  private getNoticeToVacateTemplate(): string {
    return `NOTICE TO VACATE

Date: {{noticeDate}}

{{landlordName}}
{{propertyAddress}}

Dear {{landlordName}},

Please accept this letter as written notification that I, {{tenantName}}, will be vacating the rental property at {{propertyAddress}} on {{vacateDate}}.

{{#reason}}Reason for vacating: {{reason}}{{/reason}}

I will ensure the property is in the same condition as when I took possession, less normal wear and tear. Please let me know the procedure for the return of my security deposit of \${{securityDeposit}}.

I can be reached at my current contact information for the final walk-through inspection.

Thank you for your understanding.

Sincerely,

_________________________
{{tenantName}}
Date: {{currentDate}}`;
  }

  public getTemplates(category?: string): DocumentTemplate[] {
    if (category) {
      return this.templates.filter(t => t.category === category);
    }
    return this.templates;
  }

  public getTemplate(id: string): DocumentTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  public createTemplate(template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>): DocumentTemplate {
    const newTemplate: DocumentTemplate = {
      ...template,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.push(newTemplate);
    return newTemplate;
  }

  public updateTemplate(id: string, updates: Partial<DocumentTemplate>): DocumentTemplate | null {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return null;

    this.templates[index] = {
      ...this.templates[index],
      ...updates,
      updatedAt: new Date()
    };

    return this.templates[index];
  }

  public deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.templates.splice(index, 1);
    return true;
  }

  public generateDocument(
    templateId: string, 
    variables: Record<string, any>
  ): GeneratedDocument {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }

    // Validate required variables
    const missingVars = template.variables
      .filter(v => v.required && !variables[v.name])
      .map(v => v.label);

    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    // Replace variables in content
    let content = template.content;
    
    // Simple template variable replacement (in production, use a proper template engine)
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value || ''));
    }

    // Handle conditional blocks (basic implementation)
    content = this.processConditionals(content, variables);

    const generatedDoc: GeneratedDocument = {
      id: this.generateId(),
      templateId,
      variables,
      content,
      createdAt: new Date(),
      createdBy: 'current-user',
      status: 'generated'
    };

    this.generatedDocuments.push(generatedDoc);
    return generatedDoc;
  }

  private processConditionals(content: string, variables: Record<string, any>): string {
    // Simple conditional processing for {{#var}}...{{/var}} blocks
    return content.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, varName, innerContent) => {
      const value = variables[varName];
      if (value) {
        // Replace variables within the conditional block
        let processed = innerContent;
        for (const [key, val] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          processed = processed.replace(regex, String(val || ''));
        }
        return processed;
      }
      return '';
    });
  }

  public getGeneratedDocuments(): GeneratedDocument[] {
    return this.generatedDocuments;
  }

  public getGeneratedDocument(id: string): GeneratedDocument | undefined {
    return this.generatedDocuments.find(d => d.id === id);
  }

  public updateGeneratedDocumentStatus(id: string, status: GeneratedDocument['status']): boolean {
    const doc = this.getGeneratedDocument(id);
    if (!doc) return false;

    doc.status = status;
    return true;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public validateVariables(
    templateId: string, 
    variables: Record<string, any>
  ): { isValid: boolean; errors: string[] } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { isValid: false, errors: ['Template not found'] };
    }

    const errors: string[] = [];

    for (const variable of template.variables) {
      const value = variables[variable.name];

      // Check required variables
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push(`${variable.label} is required`);
        continue;
      }

      // Skip validation if value is empty
      if (value === undefined || value === null || value === '') continue;

      // Type validation
      switch (variable.type) {
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`${variable.label} must be a number`);
          } else {
            const numValue = Number(value);
            if (variable.validation?.min !== undefined && numValue < variable.validation.min) {
              errors.push(`${variable.label} must be at least ${variable.validation.min}`);
            }
            if (variable.validation?.max !== undefined && numValue > variable.validation.max) {
              errors.push(`${variable.label} must be at most ${variable.validation.max}`);
            }
          }
          break;

        case 'currency':
          if (isNaN(Number(value)) || Number(value) < 0) {
            errors.push(`${variable.label} must be a positive number`);
          }
          break;

        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push(`${variable.label} must be a valid date`);
          }
          break;

        case 'select':
          if (variable.options && !variable.options.includes(value)) {
            errors.push(`${variable.label} must be one of: ${variable.options.join(', ')}`);
          }
          break;
      }

      // Pattern validation
      if (variable.validation?.pattern) {
        const regex = new RegExp(variable.validation.pattern);
        if (!regex.test(String(value))) {
          errors.push(`${variable.label} format is invalid`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create default instance
export const documentTemplateManager = new DocumentTemplateManager();
