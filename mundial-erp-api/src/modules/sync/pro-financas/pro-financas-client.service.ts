import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  PfAuthResponse,
  PfClient,
  PfOrder,
  PfCompany,
  PfCarrier,
  PfPaymentMethod,
  PfClientClassification,
  PfDeliveryRoute,
  PfOrderType,
  PfOrderFlow,
  PfOrderModel,
  PfState,
  PfCity,
} from './dto/pro-financas.types';

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const MAX_FAILURES = 5;
const CIRCUIT_RESET_MS = 60_000; // 1 min
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;

@Injectable()
export class ProFinancasClientService implements OnModuleInit {
  private readonly logger = new Logger(ProFinancasClientService.name);
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private tokenPromise: Promise<string> | null = null;
  private readonly circuit: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };

  private readonly baseUrl: string;
  private readonly email: string;
  private readonly password: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('PRO_FINANCAS_URL', '');
    this.email = this.config.get<string>('PRO_FINANCAS_EMAIL', '');
    this.password = this.config.get<string>('PRO_FINANCAS_PASSWORD', '');
  }

  onModuleInit() {
    if (!this.baseUrl) {
      this.logger.warn('PRO_FINANCAS_URL not configured — sync disabled');
      return;
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30_000,
    });

    this.client.interceptors.request.use(async (cfg) => {
      const token = await this.getToken();
      if (token) {
        cfg.headers.Authorization = `Bearer ${token}`;
      }
      return cfg;
    });
  }

  isConfigured(): boolean {
    return !!this.baseUrl && !!this.email && !!this.password;
  }

  // ── Auth ──────────────────────────────────────────────────────────────

  private async authenticate(): Promise<string> {
    // PF API requires credentials as query params (legacy design)
    const response = await axios.post<PfAuthResponse>(
      `${this.baseUrl}/auth/authenticate`,
      null,
      { params: { email: this.email, password: this.password } },
    );
    this.token = response.data.token;
    this.tokenExpiresAt = Date.now() + 55 * 60 * 1000; // conservative 55min
    this.logger.log('Authenticated with Pro Finanças API');
    return this.token;
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }
    // Promise lock: avoid multiple concurrent re-auth calls
    if (this.tokenPromise) {
      return this.tokenPromise;
    }
    this.tokenPromise = this.authenticate();
    try {
      return await this.tokenPromise;
    } finally {
      this.tokenPromise = null;
    }
  }

  // ── Circuit Breaker ───────────────────────────────────────────────────

  private checkCircuit(): void {
    if (!this.circuit.isOpen) return;
    if (Date.now() - this.circuit.lastFailure > CIRCUIT_RESET_MS) {
      this.logger.log('Circuit breaker: half-open, retrying...');
      this.circuit.isOpen = false;
      this.circuit.failures = 0;
      return;
    }
    throw new Error('Circuit breaker OPEN — Pro Finanças API unavailable');
  }

  private recordSuccess(): void {
    this.circuit.failures = 0;
    this.circuit.isOpen = false;
  }

  private recordFailure(): void {
    this.circuit.failures++;
    this.circuit.lastFailure = Date.now();
    if (this.circuit.failures >= MAX_FAILURES) {
      this.circuit.isOpen = true;
      this.logger.error(
        `Circuit breaker OPEN after ${MAX_FAILURES} consecutive failures`,
      );
    }
  }

  // ── Retry + request wrapper ───────────────────────────────────────────

  private async request<T>(
    method: 'get',
    path: string,
    retries = MAX_RETRIES,
  ): Promise<T> {
    this.checkCircuit();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.client.get<T>(path);
        this.recordSuccess();
        return response.data;
      } catch (error) {
        const axiosErr = error as AxiosError;
        const status = axiosErr.response?.status;

        // Re-auth on 401
        if (status === 401 && attempt === 1) {
          this.token = null;
          await this.authenticate();
          continue;
        }

        this.logger.warn(
          `PF API ${method.toUpperCase()} ${path} failed (attempt ${attempt}/${retries}): ${axiosErr.message}`,
        );

        if (attempt === retries) {
          this.recordFailure();
          throw error;
        }

        await this.delay(RETRY_DELAY_MS * attempt);
      }
    }

    throw new Error('Unreachable');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Public API methods ────────────────────────────────────────────────

  async listClients(): Promise<PfClient[]> {
    return this.request<PfClient[]>('get', '/clientes');
  }

  async getClient(id: number): Promise<PfClient> {
    return this.request<PfClient>('get', `/clientes/${id}`);
  }

  async listOrders(): Promise<PfOrder[]> {
    return this.request<PfOrder[]>('get', '/pedidos');
  }

  async getOrder(id: number): Promise<PfOrder> {
    return this.request<PfOrder>('get', `/pedidos/${id}`);
  }

  async listCompanies(): Promise<PfCompany[]> {
    const data = await this.request<PfCompany | PfCompany[]>(
      'get',
      '/empresas',
    );
    return Array.isArray(data) ? data : [data];
  }

  async listCarriers(): Promise<PfCarrier[]> {
    return this.request<PfCarrier[]>('get', '/transportadoras');
  }

  async listPaymentMethods(): Promise<PfPaymentMethod[]> {
    return this.request<PfPaymentMethod[]>('get', '/pedido_forma_pagamentos');
  }

  async listClientClassifications(): Promise<PfClientClassification[]> {
    return this.request<PfClientClassification[]>(
      'get',
      '/cliente_classificacaos',
    );
  }

  async listDeliveryRoutes(): Promise<PfDeliveryRoute[]> {
    return this.request<PfDeliveryRoute[]>('get', '/cliente_rota_entregas');
  }

  async listOrderTypes(): Promise<PfOrderType[]> {
    return this.request<PfOrderType[]>('get', '/pedido_tipos');
  }

  async listOrderFlows(): Promise<PfOrderFlow[]> {
    return this.request<PfOrderFlow[]>('get', '/pedido_fluxos');
  }

  async listOrderModels(): Promise<PfOrderModel[]> {
    return this.request<PfOrderModel[]>('get', '/pedido_modelos');
  }

  async listStates(): Promise<PfState[]> {
    return this.request<PfState[]>('get', '/states');
  }

  async listStateCities(stateId: number): Promise<PfCity[]> {
    return this.request<PfCity[]>('get', `/states/${stateId}/cities`);
  }
}
