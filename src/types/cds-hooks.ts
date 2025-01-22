// src/types/cds-hooks.ts
import { FhirResource } from 'fhir/r4';

// Hook Context Types
export interface PatientViewContext {
  userId: string;
  patientId: string;
  encounterId?: string;
}

export interface OrderSelectContext extends PatientViewContext {
  selections: Array<{
    resourceType: string;
    id: string;
  }>;
}

export interface OrderSignContext extends PatientViewContext {
  draftOrders: {
    resourceType: 'Bundle';
    entry: Array<{
      resource: FhirResource;
    }>;
  };
}

// Union type for all possible hook contexts
export type HookContext = 
  | PatientViewContext 
  | OrderSelectContext 
  | OrderSignContext;

// CDS Hook Request
export interface CDSHookRequest {
  hook: string;
  hookInstance: string;
  fhirServer?: string;
  fhirAuthorization?: FHIRAuthorization;
  context: HookContext;
  prefetch?: {
    patient?: FhirResource;
    conditions?: {
      resourceType: 'Bundle';
      entry: Array<{
        resource: FhirResource;
      }>;
    };
    [key: string]: any;
  };
}

// FHIR Authorization
export interface FHIRAuthorization {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  subject: string;
}

// Card Types
export type Indicator = 'info' | 'warning' | 'critical';

export interface Source {
  label: string;
  url?: string;
  icon?: string;
}

export interface Suggestion {
  label: string;
  uuid?: string;
  actions: Action[];
}

export interface Action {
  type: 'create' | 'update' | 'delete';
  description: string;
  resource?: FhirResource;
}

export interface Link {
  label: string;
  url: string;
  type: 'absolute' | 'smart';
  appContext?: string;
}

export interface Card {
  summary: string;
  detail?: string;
  indicator: Indicator;
  source: Source;
  suggestions?: Suggestion[];
  selectionBehavior?: 'at-most-one' | 'any';
  links?: Link[];
  overrideReasons?: Array<{
    reason: {
      code: string;
      system: string;
      display: string;
    };
  }>;
}

// CDS Service Response
export interface CDSServiceResponse {
  cards: Card[];
  systemActions?: Action[];
}

// CDS Service Definition
export interface CDSService {
  hook: string;
  title?: string;
  description: string;
  id: string;
  prefetch?: {
    [key: string]: string;
  };
}

// CDS Services Discovery Response
export interface CDSServicesDiscovery {
  services: CDSService[];
}

// Error Responses
export interface CDSServiceError {
  error: string;
  errorDetail?: string;
}

// Helper Types
export interface PrefetchTemplate {
  [key: string]: string;
}

export interface HookDefinition {
  id: string;
  title: string;
  description: string;
  prefetch?: PrefetchTemplate;
}

// CDS Hook Types with Metadata
export const HOOK_TYPES = {
  'patient-view': {
    id: 'patient-view',
    title: 'Patient View',
    description: 'When a patient\'s record is selected and opened in the EHR'
  },
  'order-select': {
    id: 'order-select',
    title: 'Order Select',
    description: 'When a clinician selects one or more orders to sign'
  },
  'order-sign': {
    id: 'order-sign',
    title: 'Order Sign',
    description: 'When a clinician is ready to sign one or more orders'
  }
} as const;

export type HookType = keyof typeof HOOK_TYPES;

// Type Guards
export const isPatientViewContext = (context: HookContext): context is PatientViewContext => {
  return 'patientId' in context && !('selections' in context) && !('draftOrders' in context);
};

export const isOrderSelectContext = (context: HookContext): context is OrderSelectContext => {
  return 'selections' in context;
};

export const isOrderSignContext = (context: HookContext): context is OrderSignContext => {
  return 'draftOrders' in context;
};

// Utility Types
export type PrefetchResources = {
  [key: string]: FhirResource | undefined;
};

export type CDSHookContextType<T extends HookType> = 
  T extends 'patient-view' ? PatientViewContext :
  T extends 'order-select' ? OrderSelectContext :
  T extends 'order-sign' ? OrderSignContext :
  never;

// Configuration Types
export interface CDSServiceConfig {
  id: string;
  title: string;
  description: string;
  hook: HookType;
  enabled: boolean;
  prefetch?: PrefetchTemplate;
  config?: {
    [key: string]: any;
  };
}

export interface CDSHooksConfig {
  baseUrl: string;
  services: CDSServiceConfig[];
  auth?: {
    type: 'jwt' | 'oauth2';
    [key: string]: any;
  };
}