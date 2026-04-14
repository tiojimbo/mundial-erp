'use client';

import type { Client } from '../../types/client.types';

type ClientDataTabProps = {
  client: Client;
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

export function ClientDataTab({ client }: ClientDataTabProps) {
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
            value={client.personType === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'}
          />
          <DataRow
            label={client.personType === 'F' ? 'CPF' : 'CNPJ'}
            value={client.cpfCnpj}
          />
          <DataRow
            label={client.personType === 'F' ? 'Nome Completo' : 'Razão Social'}
            value={client.name}
          />
          <DataRow
            label={client.personType === 'F' ? 'Apelido' : 'Nome Fantasia'}
            value={client.tradeName}
          />
          {client.personType === 'J' && (
            <DataRow label='Inscrição Estadual' value={client.ie} />
          )}
          {client.personType === 'F' && (
            <DataRow label='RG' value={client.rg} />
          )}
        </div>
      </div>

      {/* Contato */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>Contato</h3>
        <div className='grid gap-4 sm:grid-cols-2'>
          <DataRow label='E-mail' value={client.email} />
          <DataRow label='Telefone' value={client.phone} />
        </div>
      </div>

      {/* Endereço */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>Endereço</h3>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <DataRow label='CEP' value={client.zipCode} />
          <DataRow
            label='Logradouro'
            value={
              client.address
                ? `${client.address}${client.addressNumber ? `, ${client.addressNumber}` : ''}`
                : null
            }
          />
          <DataRow label='Bairro' value={client.neighborhood} />
          <DataRow label='Complemento' value={client.complement} />
          <DataRow label='Cidade' value={client.city} />
          <DataRow label='UF' value={client.state} />
        </div>
      </div>

      {/* Classificação */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>
          Classificação
        </h3>
        <div className='grid gap-4 sm:grid-cols-2'>
          <DataRow
            label='Classificação'
            value={client.classification?.name}
          />
          <DataRow
            label='Rota de Entrega'
            value={client.deliveryRoute?.name}
          />
        </div>
      </div>
    </div>
  );
}
