'use client';

import { formatCpfCnpj, formatDateTime } from '@/lib/formatters';
import type { Supplier } from '../../types/supplier.types';

type SupplierDataTabProps = {
  supplier: Supplier;
};

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-paragraph-xs text-text-soft-400'>{label}</span>
      <span className='text-paragraph-sm text-text-strong-950'>
        {value || '—'}
      </span>
    </div>
  );
}

export function SupplierDataTab({ supplier }: SupplierDataTabProps) {
  return (
    <div className='space-y-6'>
      {/* Dados Principais */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>
          Dados Principais
        </h3>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <DataRow
            label='Tipo de Pessoa'
            value={supplier.personType === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'}
          />
          <DataRow
            label={supplier.personType === 'F' ? 'CPF' : 'CNPJ'}
            value={formatCpfCnpj(supplier.cpfCnpj)}
          />
          <DataRow
            label={supplier.personType === 'F' ? 'Nome Completo' : 'Razão Social'}
            value={supplier.name}
          />
          <DataRow
            label={supplier.personType === 'F' ? 'Apelido' : 'Nome Fantasia'}
            value={supplier.tradeName}
          />
          {supplier.personType === 'J' && (
            <DataRow label='Inscrição Estadual' value={supplier.ie} />
          )}
          <DataRow
            label='Status'
            value={supplier.isActive ? 'Ativo' : 'Inativo'}
          />
        </div>
      </div>

      {/* Contato */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>Contato</h3>
        <div className='grid gap-4 sm:grid-cols-2'>
          <DataRow label='E-mail' value={supplier.email} />
          <DataRow label='Telefone' value={supplier.phone} />
        </div>
      </div>

      {/* Endereço */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>Endereço</h3>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <DataRow label='CEP' value={supplier.zipCode} />
          <DataRow label='Logradouro' value={supplier.address} />
          <DataRow label='Cidade' value={supplier.city} />
          <DataRow label='UF' value={supplier.state} />
        </div>
      </div>

      {/* Informações do Sistema */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>
          Informações do Sistema
        </h3>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <DataRow
            label='Cadastrado em'
            value={formatDateTime(supplier.createdAt)}
          />
          <DataRow
            label='Última atualização'
            value={formatDateTime(supplier.updatedAt)}
          />
          <DataRow
            label='ID Pro Finanças'
            value={supplier.proFinancasId?.toString()}
          />
        </div>
      </div>
    </div>
  );
}
