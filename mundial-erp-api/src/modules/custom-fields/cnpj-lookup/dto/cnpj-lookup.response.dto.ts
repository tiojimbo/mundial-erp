import { ApiProperty } from '@nestjs/swagger';

class CnaeDto {
  @ApiProperty({ example: '0600001' })
  codigo!: string;

  @ApiProperty({ example: 'Extração de petróleo e gás natural' })
  descricao!: string;
}

class EnderecoDto {
  @ApiProperty({ nullable: true }) logradouro!: string | null;
  @ApiProperty({ nullable: true }) numero!: string | null;
  @ApiProperty({ nullable: true }) complemento!: string | null;
  @ApiProperty({ nullable: true }) bairro!: string | null;
  @ApiProperty({ nullable: true }) cep!: string | null;
  @ApiProperty({ nullable: true }) municipio!: string | null;
  @ApiProperty({ nullable: true }) codigoMunicipio!: string | null;
  @ApiProperty({ nullable: true }) uf!: string | null;
}

class ContatoDto {
  @ApiProperty({ nullable: true }) telefone!: string | null;
  @ApiProperty({ nullable: true }) email!: string | null;
}

export class CnpjLookupResponseDto {
  @ApiProperty({ example: '33000167000101' })
  cnpj!: string;

  @ApiProperty({ example: 'PETROLEO BRASILEIRO S A PETROBRAS' })
  razaoSocial!: string;

  @ApiProperty({ nullable: true })
  nomeFantasia!: string | null;

  @ApiProperty({ nullable: true })
  situacaoCadastral!: string | null;

  @ApiProperty({ nullable: true, example: '1966-09-28' })
  dataAbertura!: string | null;

  @ApiProperty({ type: CnaeDto, nullable: true })
  cnaePrincipal!: CnaeDto | null;

  @ApiProperty({ type: [CnaeDto] })
  cnaesSecundarios!: CnaeDto[];

  @ApiProperty({ nullable: true })
  naturezaJuridica!: string | null;

  @ApiProperty({ nullable: true })
  porte!: string | null;

  @ApiProperty({ nullable: true, example: 205431960490.52 })
  capitalSocial!: number | null;

  @ApiProperty({ type: EnderecoDto })
  endereco!: EnderecoDto;

  @ApiProperty({ type: ContatoDto })
  contato!: ContatoDto;

  @ApiProperty({ enum: ['brasil-api', 'receita-ws'] })
  fonte!: string;

  @ApiProperty({ example: '2026-05-18T12:00:00.000Z' })
  consultadoEm!: string;
}
