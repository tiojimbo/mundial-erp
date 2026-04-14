'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiLoader4Line,
  RiCheckLine,
} from '@remixicon/react';
import * as HorizontalStepper from '@/components/ui/horizontal-stepper';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  type Step1FormData,
  type Step2FormData,
  type Step3FormData,
  type Step4FormData,
  type ProductFormData,
} from '../schemas/product.schema';
import {
  useProductTypes,
  useNextProductCode,
  useUnitMeasures,
  useBrands,
  useProductDepartments,
} from '../hooks/use-products';
import { usePriceTables } from '@/features/price-tables/hooks/use-price-tables';
import { CLASSIFICATION_OPTIONS } from '../utils/constants';
import type { Product } from '../types/product.types';

type ProductWizardProps = {
  defaultValues?: Product;
  onSubmit: (data: ProductFormData) => void;
  isLoading: boolean;
  title: string;
};

const STEPS = [
  { label: 'Identificação', number: 1 },
  { label: 'Especificação', number: 2 },
  { label: 'Fiscal', number: 3 },
  { label: 'Precificação', number: 4 },
];

export function ProductWizard({
  defaultValues,
  onSubmit,
  isLoading,
  title,
}: ProductWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const { data: productTypes } = useProductTypes();
  const { data: unitMeasures } = useUnitMeasures();
  const { data: brands } = useBrands();
  const { data: departments } = useProductDepartments();
  const { data: priceTables } = usePriceTables();

  // Step 1 form
  const step1Form = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: defaultValues
      ? {
          productTypeId: defaultValues.productTypeId,
          name: defaultValues.name,
          departmentCategoryId: defaultValues.departmentCategoryId,
          brandId: defaultValues.brandId,
          unitMeasureId: defaultValues.unitMeasureId,
          boxUnitMeasureId: defaultValues.boxUnitMeasureId ?? '',
          unitsPerBox: defaultValues.unitsPerBox ?? '',
        }
      : {
          productTypeId: '',
          name: '',
          departmentCategoryId: '',
          brandId: '',
          unitMeasureId: '',
          boxUnitMeasureId: '',
          unitsPerBox: '',
        },
  });

  // Step 2 form
  const step2Form = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: defaultValues
      ? {
          weight: defaultValues.weight ?? 0,
          width: defaultValues.width ?? 0,
          height: defaultValues.height ?? 0,
          length: defaultValues.length ?? 0,
          weightM3: defaultValues.weightM3 ?? '',
          productionCapacity: defaultValues.productionCapacity ?? '',
          stockLocation: defaultValues.stockLocation ?? '',
          minStock: defaultValues.minStock ?? 0,
          piecesPerUnit: defaultValues.piecesPerUnit ?? '',
          size: defaultValues.size ?? '',
          classification: defaultValues.classification ?? undefined,
          loadCapacity: defaultValues.loadCapacity ?? '',
          beta: defaultValues.beta ?? '',
          fckMpa: defaultValues.fckMpa ?? '',
        }
      : {
          weight: 0,
          width: 0,
          height: 0,
          length: 0,
          weightM3: '',
          productionCapacity: '',
          stockLocation: '',
          minStock: 0,
          piecesPerUnit: '',
          size: '',
          classification: undefined,
          loadCapacity: '',
          beta: '',
          fckMpa: '',
        },
  });

  // Step 3 form
  const step3Form = useForm<Step3FormData>({
    resolver: zodResolver(step3Schema),
    defaultValues: defaultValues
      ? {
          ncmCode: defaultValues.ncmCode ?? '',
          nfeOriginId: defaultValues.nfeOriginId ?? '',
          cfopDefault: defaultValues.cfopDefault ?? '',
          ipiRate: defaultValues.ipiRate ?? '',
          taxBasketId: defaultValues.taxBasketId ?? '',
        }
      : {
          ncmCode: '',
          nfeOriginId: '',
          cfopDefault: '',
          ipiRate: '',
          taxBasketId: '',
        },
  });

  // Step 4 form
  const step4Form = useForm<Step4FormData>({
    resolver: zodResolver(step4Schema),
    defaultValues: defaultValues
      ? {
          costPrice: defaultValues.costPrice
            ? defaultValues.costPrice / 100
            : 0,
          salePrice: defaultValues.salePrice
            ? defaultValues.salePrice / 100
            : 0,
          minSalePrice: defaultValues.minSalePrice
            ? defaultValues.minSalePrice / 100
            : 0,
          defaultPriceTableId: defaultValues.defaultPriceTableId ?? '',
        }
      : {
          costPrice: 0,
          salePrice: 0,
          minSalePrice: 0,
          defaultPriceTableId: '',
        },
  });

  // Auto-generate code when product type changes
  const selectedTypeId = step1Form.watch('productTypeId');
  const { data: nextCode } = useNextProductCode(selectedTypeId);

  const [generatedCode, setGeneratedCode] = useState(
    defaultValues?.code ?? '',
  );
  const [generatedBarcode, setGeneratedBarcode] = useState(
    defaultValues?.barcode ?? '',
  );

  useEffect(() => {
    if (nextCode && !defaultValues) {
      setGeneratedCode(nextCode.code);
      setGeneratedBarcode(nextCode.barcode);
    }
  }, [nextCode, defaultValues]);

  function getStepState(step: number) {
    if (step < currentStep) return 'completed' as const;
    if (step === currentStep) return 'active' as const;
    return 'default' as const;
  }

  async function handleNext() {
    if (currentStep === 1) {
      const valid = await step1Form.trigger();
      if (valid) setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await step2Form.trigger();
      if (valid) setCurrentStep(3);
    } else if (currentStep === 3) {
      const valid = await step3Form.trigger();
      if (valid) setCurrentStep(4);
    }
  }

  function handleBack() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  function handleFinalSubmit() {
    step4Form.handleSubmit((step4Data) => {
      const allData: ProductFormData = {
        ...step1Form.getValues(),
        ...step2Form.getValues(),
        ...step3Form.getValues(),
        ...step4Data,
      } as ProductFormData;

      // Convert prices from reais to centavos
      allData.costPrice = Math.round(allData.costPrice * 100);
      allData.salePrice = Math.round(allData.salePrice * 100);
      allData.minSalePrice = Math.round(allData.minSalePrice * 100);

      onSubmit(allData);
    })();
  }

  return (
    <div className='mx-auto max-w-3xl space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-3'>
        <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
          <Link href='/compras/produtos'>
            <Button.Icon as={RiArrowLeftLine} />
          </Link>
        </Button.Root>
        <h1 className='text-title-h5 text-text-strong-950'>{title}</h1>
      </div>

      {/* Stepper */}
      <HorizontalStepper.Root>
        {STEPS.map((step, idx) => (
          <span key={step.number} className='contents'>
            {idx > 0 && <HorizontalStepper.SeparatorIcon />}
            <HorizontalStepper.Item
              state={getStepState(step.number)}
              onClick={() => {
                if (step.number < currentStep) setCurrentStep(step.number);
              }}
              type='button'
              className={step.number > currentStep ? 'cursor-not-allowed opacity-50' : step.number < currentStep ? 'cursor-pointer' : ''}
            >
              <HorizontalStepper.ItemIndicator>
                {step.number}
              </HorizontalStepper.ItemIndicator>
              {step.label}
            </HorizontalStepper.Item>
          </span>
        ))}
      </HorizontalStepper.Root>

      {/* Step Content */}
      {currentStep === 1 && (
        <StepIdentification
          form={step1Form}
          productTypes={productTypes}
          unitMeasures={unitMeasures}
          brands={brands}
          departments={departments}
          generatedCode={generatedCode}
          generatedBarcode={generatedBarcode}
        />
      )}
      {currentStep === 2 && <StepSpecification form={step2Form} />}
      {currentStep === 3 && <StepFiscal form={step3Form} />}
      {currentStep === 4 && (
        <StepPricing form={step4Form} priceTables={priceTables} />
      )}

      {/* Navigation */}
      <div className='flex items-center justify-between'>
        <div>
          {currentStep > 1 && (
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='medium'
              onClick={handleBack}
              type='button'
            >
              <Button.Icon as={RiArrowLeftLine} />
              Voltar
            </Button.Root>
          )}
        </div>
        <div className='flex gap-3'>
          <Button.Root asChild variant='neutral' mode='stroke' size='medium'>
            <Link href='/compras/produtos'>Cancelar</Link>
          </Button.Root>
          {currentStep < 4 ? (
            <Button.Root
              variant='primary'
              mode='filled'
              size='medium'
              onClick={handleNext}
              type='button'
            >
              Próximo
              <Button.Icon as={RiArrowRightLine} />
            </Button.Root>
          ) : (
            <Button.Root
              variant='primary'
              mode='filled'
              size='medium'
              onClick={handleFinalSubmit}
              disabled={isLoading}
              type='button'
            >
              {isLoading ? (
                <RiLoader4Line className='size-5 animate-spin' />
              ) : (
                <Button.Icon as={RiCheckLine} />
              )}
              {defaultValues ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </Button.Root>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Identification ─────────────────────────────────────────

type StepIdentificationProps = {
  form: ReturnType<typeof useForm<Step1FormData>>;
  productTypes?: Array<{ id: string; prefix: string; name: string }>;
  unitMeasures?: Array<{ id: string; name: string }>;
  brands?: Array<{ id: string; name: string }>;
  departments?: Array<{ id: string; name: string }>;
  generatedCode: string;
  generatedBarcode: string;
};

function StepIdentification({
  form,
  productTypes,
  unitMeasures,
  brands,
  departments,
  generatedCode,
  generatedBarcode,
}: StepIdentificationProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  const selectedUnitMeasureId = watch('unitMeasureId');

  return (
    <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
      <legend className='px-2 text-label-md text-text-strong-950'>
        Etapa 1 — Identificação
      </legend>

      {/* Product Type */}
      <div className='space-y-1.5'>
        <Label.Root>
          Tipo de Produto <Label.Asterisk />
        </Label.Root>
        <Controller
          name='productTypeId'
          control={control}
          render={({ field }) => (
            <Select.Root value={field.value} onValueChange={field.onChange}>
              <Select.Trigger>
                <Select.Value placeholder='Selecione o tipo' />
              </Select.Trigger>
              <Select.Content>
                {productTypes?.map((t) => (
                  <Select.Item key={t.id} value={t.id}>
                    {t.prefix} — {t.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        />
        {errors.productTypeId && (
          <Hint.Root hasError>{errors.productTypeId.message}</Hint.Root>
        )}
      </div>

      {/* Código do Produto + EAN-13 — PLANO 1.5b: imutáveis, gerados ao selecionar tipo */}
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label.Root>Código do Produto</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                value={generatedCode}
                placeholder='Selecione o tipo acima'
                readOnly
                disabled
              />
            </Input.Wrapper>
          </Input.Root>
          <Hint.Root>
            Ex: TT-0001 — prefixo do tipo + sequencial (imutável)
          </Hint.Root>
        </div>
        <div className='space-y-1.5'>
          <Label.Root>EAN-13 (código de barras)</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                value={generatedBarcode}
                placeholder='Gerado com o código'
                readOnly
                disabled
              />
            </Input.Wrapper>
          </Input.Root>
          <Hint.Root>
            13 dígitos numéricos para leitura por scanner (imutável)
          </Hint.Root>
        </div>
      </div>

      {/* Name */}
      <div className='space-y-1.5'>
        <Label.Root htmlFor='name'>
          Descrição do Produto <Label.Asterisk />
        </Label.Root>
        <Input.Root hasError={!!errors.name}>
          <Input.Wrapper>
            <Input.Input
              id='name'
              placeholder='Ex: Telha Térmica TT40 c/ EPS'
              {...register('name')}
            />
          </Input.Wrapper>
        </Input.Root>
        {errors.name && (
          <Hint.Root hasError>{errors.name.message}</Hint.Root>
        )}
      </div>

      {/* Department & Brand */}
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label.Root>
            Departamento <Label.Asterisk />
          </Label.Root>
          <Controller
            name='departmentCategoryId'
            control={control}
            render={({ field }) => (
              <Select.Root value={field.value} onValueChange={field.onChange}>
                <Select.Trigger>
                  <Select.Value placeholder='Selecione o departamento' />
                </Select.Trigger>
                <Select.Content>
                  {departments?.map((d) => (
                    <Select.Item key={d.id} value={d.id}>
                      {d.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            )}
          />
          {errors.departmentCategoryId && (
            <Hint.Root hasError>
              {errors.departmentCategoryId.message}
            </Hint.Root>
          )}
        </div>
        <div className='space-y-1.5'>
          <Label.Root>
            Marca <Label.Asterisk />
          </Label.Root>
          <Controller
            name='brandId'
            control={control}
            render={({ field }) => (
              <Select.Root value={field.value} onValueChange={field.onChange}>
                <Select.Trigger>
                  <Select.Value placeholder='Selecione a marca' />
                </Select.Trigger>
                <Select.Content>
                  {brands?.map((b) => (
                    <Select.Item key={b.id} value={b.id}>
                      {b.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            )}
          />
          {errors.brandId && (
            <Hint.Root hasError>{errors.brandId.message}</Hint.Root>
          )}
        </div>
      </div>

      {/* Unit Measure — base unit (estoque sempre nesta unidade) */}
      <div className='space-y-1.5'>
        <Label.Root>
          Unidade de Medida Base <Label.Asterisk />
        </Label.Root>
        <Controller
          name='unitMeasureId'
          control={control}
          render={({ field }) => (
            <Select.Root value={field.value} onValueChange={field.onChange}>
              <Select.Trigger>
                <Select.Value placeholder='Selecione (UN, M2, KG, ML, PC...)' />
              </Select.Trigger>
              <Select.Content>
                {unitMeasures?.map((u) => (
                  <Select.Item key={u.id} value={u.id}>
                    {u.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        />
        {errors.unitMeasureId && (
          <Hint.Root hasError>{errors.unitMeasureId.message}</Hint.Root>
        )}
        <Hint.Root>Estoque será controlado nesta unidade</Hint.Root>
      </div>

      {/* Box unit — só aparece após selecionar unidade base (PLANO 1.5b: UN↔CX) */}
      {selectedUnitMeasureId && (
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label.Root>Unidade de Conjunto/Caixa</Label.Root>
            <Controller
              name='boxUnitMeasureId'
              control={control}
              render={({ field }) => (
                <Select.Root
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <Select.Trigger>
                    <Select.Value placeholder='Nenhuma (opcional)' />
                  </Select.Trigger>
                  <Select.Content>
                    {unitMeasures
                      ?.filter((u) => u.id !== selectedUnitMeasureId)
                      .map((u) => (
                        <Select.Item key={u.id} value={u.id}>
                          {u.name}
                        </Select.Item>
                      ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
            <Hint.Root>Ex: CX (caixa) para conversão UN↔CX</Hint.Root>
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='unitsPerBox'>
              Unidades por Caixa
            </Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input
                  id='unitsPerBox'
                  type='number'
                  placeholder='Ex: 1000'
                  {...register('unitsPerBox')}
                />
              </Input.Wrapper>
            </Input.Root>
            <Hint.Root>Quantas unidades base cabem em 1 caixa</Hint.Root>
          </div>
        </div>
      )}
    </fieldset>
  );
}

// ─── Step 2: Technical Specification ────────────────────────────────

type StepSpecificationProps = {
  form: ReturnType<typeof useForm<Step2FormData>>;
};

function StepSpecification({ form }: StepSpecificationProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
      <legend className='px-2 text-label-md text-text-strong-950'>
        Etapa 2 — Especificação Técnica
      </legend>

      {/* Classification */}
      <div className='space-y-1.5'>
        <Label.Root>
          Classificação <Label.Asterisk />
        </Label.Root>
        <Controller
          name='classification'
          control={control}
          render={({ field }) => (
            <Select.Root value={field.value} onValueChange={field.onChange}>
              <Select.Trigger>
                <Select.Value placeholder='Selecione a classificação' />
              </Select.Trigger>
              <Select.Content>
                {CLASSIFICATION_OPTIONS.map((c) => (
                  <Select.Item key={c.value} value={c.value}>
                    {c.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        />
        {errors.classification && (
          <Hint.Root hasError>{errors.classification.message}</Hint.Root>
        )}
      </div>

      {/* Dimensions */}
      <div className='grid gap-4 sm:grid-cols-4'>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='weight'>
            Peso (kg) <Label.Asterisk />
          </Label.Root>
          <Input.Root hasError={!!errors.weight}>
            <Input.Wrapper>
              <Input.Input
                id='weight'
                type='number'
                step='0.01'
                {...register('weight')}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.weight && (
            <Hint.Root hasError>{errors.weight.message}</Hint.Root>
          )}
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='width'>
            Largura (m) <Label.Asterisk />
          </Label.Root>
          <Input.Root hasError={!!errors.width}>
            <Input.Wrapper>
              <Input.Input
                id='width'
                type='number'
                step='0.01'
                {...register('width')}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.width && (
            <Hint.Root hasError>{errors.width.message}</Hint.Root>
          )}
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='height'>
            Altura (m) <Label.Asterisk />
          </Label.Root>
          <Input.Root hasError={!!errors.height}>
            <Input.Wrapper>
              <Input.Input
                id='height'
                type='number'
                step='0.01'
                {...register('height')}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.height && (
            <Hint.Root hasError>{errors.height.message}</Hint.Root>
          )}
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='length'>
            Comprimento (m) <Label.Asterisk />
          </Label.Root>
          <Input.Root hasError={!!errors.length}>
            <Input.Wrapper>
              <Input.Input
                id='length'
                type='number'
                step='0.01'
                {...register('length')}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.length && (
            <Hint.Root hasError>{errors.length.message}</Hint.Root>
          )}
        </div>
      </div>

      {/* Stock */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='minStock'>
            Estoque Mínimo <Label.Asterisk />
          </Label.Root>
          <Input.Root hasError={!!errors.minStock}>
            <Input.Wrapper>
              <Input.Input
                id='minStock'
                type='number'
                step='0.01'
                {...register('minStock')}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.minStock && (
            <Hint.Root hasError>{errors.minStock.message}</Hint.Root>
          )}
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='stockLocation'>Endereçamento</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='stockLocation'
                placeholder='Ex: A1-B2'
                {...register('stockLocation')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='weightM3'>Peso M3</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='weightM3'
                type='number'
                step='0.01'
                {...register('weightM3')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
      </div>

      {/* Optional fields */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='productionCapacity'>Cap. Produtiva</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='productionCapacity'
                type='number'
                step='0.01'
                {...register('productionCapacity')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='piecesPerUnit'>Peças por Unidade</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='piecesPerUnit'
                type='number'
                step='0.01'
                placeholder='Ex: 10.0'
                {...register('piecesPerUnit')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='size'>Tamanho</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='size'
                type='number'
                step='0.01'
                placeholder='Ex: 3.5'
                {...register('size')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='loadCapacity'>S/Carga (kg/m2)</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='loadCapacity'
                type='number'
                step='0.01'
                {...register('loadCapacity')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='beta'>Beta</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='beta'
                type='number'
                step='0.01'
                {...register('beta')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='fckMpa'>FCK (MPa)</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='fckMpa'
                type='number'
                step='0.01'
                {...register('fckMpa')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
      </div>
    </fieldset>
  );
}

// ─── Step 3: Fiscal ─────────────────────────────────────────────────

type StepFiscalProps = {
  form: ReturnType<typeof useForm<Step3FormData>>;
};

function StepFiscal({ form }: StepFiscalProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
      <legend className='px-2 text-label-md text-text-strong-950'>
        Etapa 3 — Fiscal e Tributação
      </legend>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='ncmCode'>
            NCM <Label.Asterisk />
          </Label.Root>
          <Input.Root hasError={!!errors.ncmCode}>
            <Input.Wrapper>
              <Input.Input
                id='ncmCode'
                placeholder='Ex: 7308.90.90'
                {...register('ncmCode')}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.ncmCode && (
            <Hint.Root hasError>{errors.ncmCode.message}</Hint.Root>
          )}
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='cfopDefault'>CFOP Padrão</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='cfopDefault'
                placeholder='Ex: 5102'
                {...register('cfopDefault')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='nfeOriginId'>Origem NFe</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='nfeOriginId'
                placeholder='Código de origem'
                {...register('nfeOriginId')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='ipiRate'>Alíquota IPI (%)</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='ipiRate'
                type='number'
                step='0.01'
                placeholder='Ex: 5.00'
                {...register('ipiRate')}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label.Root htmlFor='taxBasketId'>Cesta de Tributação</Label.Root>
        <Input.Root>
          <Input.Wrapper>
            <Input.Input
              id='taxBasketId'
              placeholder='ID da cesta (opcional)'
              {...register('taxBasketId')}
            />
          </Input.Wrapper>
        </Input.Root>
      </div>
    </fieldset>
  );
}

// ─── Step 4: Pricing ────────────────────────────────────────────────

type StepPricingProps = {
  form: ReturnType<typeof useForm<Step4FormData>>;
  priceTables?: Array<{ id: string; name: string; isDefault: boolean }>;
};

function StepPricing({ form, priceTables }: StepPricingProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
      <legend className='px-2 text-label-md text-text-strong-950'>
        Etapa 4 — Precificação
      </legend>

      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='costPrice'>Preço de Custo (R$)</Label.Root>
          <Input.Root hasError={!!errors.costPrice}>
            <Input.Wrapper>
              <Input.Input
                id='costPrice'
                type='number'
                step='0.01'
                placeholder='0,00'
                {...register('costPrice')}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.costPrice && (
            <Hint.Root hasError>{errors.costPrice.message}</Hint.Root>
          )}
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='salePrice'>
            Preço de Venda (R$) <Label.Asterisk />
          </Label.Root>
          <Input.Root hasError={!!errors.salePrice}>
            <Input.Wrapper>
              <Input.Input
                id='salePrice'
                type='number'
                step='0.01'
                placeholder='0,00'
                {...register('salePrice')}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.salePrice && (
            <Hint.Root hasError>{errors.salePrice.message}</Hint.Root>
          )}
        </div>
        <div className='space-y-1.5'>
          <Label.Root htmlFor='minSalePrice'>Preço Mínimo (R$)</Label.Root>
          <Input.Root hasError={!!errors.minSalePrice}>
            <Input.Wrapper>
              <Input.Input
                id='minSalePrice'
                type='number'
                step='0.01'
                placeholder='0,00'
                {...register('minSalePrice')}
              />
            </Input.Wrapper>
          </Input.Root>
          {errors.minSalePrice && (
            <Hint.Root hasError>{errors.minSalePrice.message}</Hint.Root>
          )}
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label.Root>Tabela de Preço Padrão</Label.Root>
        <Controller
          name='defaultPriceTableId'
          control={control}
          render={({ field }) => (
            <Select.Root
              value={field.value || undefined}
              onValueChange={field.onChange}
            >
              <Select.Trigger>
                <Select.Value placeholder='Nenhuma (opcional)' />
              </Select.Trigger>
              <Select.Content>
                {priceTables?.map((pt) => (
                  <Select.Item key={pt.id} value={pt.id}>
                    {pt.name}
                    {pt.isDefault ? ' (padrão)' : ''}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        />
      </div>
    </fieldset>
  );
}
