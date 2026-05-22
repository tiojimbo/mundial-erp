import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAutomationDto } from './create-automation.dto';

interface RawAutomation {
  name?: string;
  trigger?: string;
  scopeType?: string;
  scopeId?: string;
  cronExpression?: string;
  timezone?: string;
  compiledActions?: Array<{ type: string; params?: Record<string, unknown> }>;
}

async function buildAndValidate(raw: RawAutomation) {
  const instance = plainToInstance(CreateAutomationDto, raw, {
    enableImplicitConversion: true,
  });
  const errors = await validate(instance, { whitelist: true });
  return { instance, errors };
}

const validActions = [{ type: 'change_status', params: { statusId: 'st-1' } }];

describe('CreateAutomationDto — @ValidateIf scopes e cron', () => {
  describe('scopeType', () => {
    it('passa quando scopeType=WORKSPACE sem scopeId', async () => {
      const { errors } = await buildAndValidate({
        name: 'WS only',
        trigger: 'TASK_CREATED',
        scopeType: 'WORKSPACE',
        compiledActions: validActions,
      });
      expect(errors).toEqual([]);
    });

    it('falha quando scopeType=LIST sem scopeId, com mensagem explicita', async () => {
      const { errors } = await buildAndValidate({
        name: 'List sem id',
        trigger: 'TASK_CREATED',
        scopeType: 'LIST',
        compiledActions: validActions,
      });

      const scopeIdError = errors.find((e) => e.property === 'scopeId');
      expect(scopeIdError).toBeDefined();
      const messages = Object.values(scopeIdError?.constraints ?? {});
      expect(
        messages.some((m) =>
          m.includes('scopeId é obrigatório quando scopeType ≠ WORKSPACE'),
        ),
      ).toBe(true);
    });

    it('passa quando scopeType=LIST com scopeId', async () => {
      const { errors } = await buildAndValidate({
        name: 'Com id',
        trigger: 'TASK_CREATED',
        scopeType: 'LIST',
        scopeId: 'list-123',
        compiledActions: validActions,
      });
      expect(errors).toEqual([]);
    });
  });

  describe('trigger=CRON', () => {
    it('passa quando trigger=CRON tem cronExpression e timezone', async () => {
      const { errors } = await buildAndValidate({
        name: 'Cron diario',
        trigger: 'CRON',
        scopeType: 'WORKSPACE',
        cronExpression: '0 9 * * 1-5',
        timezone: 'America/Sao_Paulo',
        compiledActions: validActions,
      });
      expect(errors).toEqual([]);
    });

    it('falha quando trigger=CRON sem cronExpression, com mensagem explicita', async () => {
      const { errors } = await buildAndValidate({
        name: 'Cron sem expr',
        trigger: 'CRON',
        scopeType: 'WORKSPACE',
        timezone: 'America/Sao_Paulo',
        compiledActions: validActions,
      });

      const cronError = errors.find((e) => e.property === 'cronExpression');
      expect(cronError).toBeDefined();
      const messages = Object.values(cronError?.constraints ?? {});
      expect(
        messages.some((m) =>
          m.includes('cronExpression é obrigatório quando trigger=CRON'),
        ),
      ).toBe(true);
    });

    it('falha quando trigger=CRON sem timezone, com mensagem explicita', async () => {
      const { errors } = await buildAndValidate({
        name: 'Cron sem tz',
        trigger: 'CRON',
        scopeType: 'WORKSPACE',
        cronExpression: '0 9 * * 1-5',
        compiledActions: validActions,
      });

      const tzError = errors.find((e) => e.property === 'timezone');
      expect(tzError).toBeDefined();
      const messages = Object.values(tzError?.constraints ?? {});
      expect(
        messages.some((m) =>
          m.includes('timezone é obrigatório quando trigger=CRON'),
        ),
      ).toBe(true);
    });

    it('nao exige cronExpression quando trigger != CRON', async () => {
      const { errors } = await buildAndValidate({
        name: 'Task created',
        trigger: 'TASK_CREATED',
        scopeType: 'WORKSPACE',
        compiledActions: validActions,
      });
      expect(
        errors.find((e) => e.property === 'cronExpression'),
      ).toBeUndefined();
      expect(errors.find((e) => e.property === 'timezone')).toBeUndefined();
    });
  });
});
