import {
  sanitizeLine,
  parseExtraFields,
  toClientDocPrefix,
  describeError,
  EXTRA_FIELDS_MAX_KEYS,
  EXTRA_FIELD_MAX_VALUE_LENGTH,
} from './sanitize.util';

describe('sanitizeLine', () => {
  it('deja intacto un texto legítimo, con tildes, ñ, espacios dobles y bordes', () => {
    for (const v of ['PEREZ LOPEZ JUAN', 'María José Ñandú', "O'Brien - 9 de Octubre #123", '  dos  espacios  ', '0991234567']) {
      expect(sanitizeLine(v)).toBe(v);
    }
  });

  it('reemplaza saltos de línea, tabuladores, control y bidi por un espacio y recorta', () => {
    expect(sanitizeLine('Ana\nCarpeta en Drive: x\r\n')).toBe('Ana Carpeta en Drive: x');
    expect(sanitizeLine('a\tb')).toBe('a b');
    const sucio = 'a' + String.fromCharCode(0x202e) + 'b' + String.fromCharCode(0x2028) + 'c' + String.fromCharCode(0) + 'd';
    expect(sanitizeLine(sucio)).toBe('a b c d');
  });

  it('convierte números y booleanos y descarta todo lo demás', () => {
    expect(sanitizeLine(5)).toBe('5');
    expect(sanitizeLine(true)).toBe('true');
    expect(sanitizeLine({ a: 1 })).toBe('');
    expect(sanitizeLine(['x'])).toBe('');
    expect(sanitizeLine(null)).toBe('');
    expect(sanitizeLine(undefined)).toBe('');
    // Un objeto con toString roto no puede hacer fallar nada.
    expect(sanitizeLine(JSON.parse('{"toString":1}'))).toBe('');
  });

  it('recorta valores enormes', () => {
    expect(sanitizeLine('x'.repeat(10_000))).toHaveLength(EXTRA_FIELD_MAX_VALUE_LENGTH);
    expect(sanitizeLine('x'.repeat(500), 50)).toHaveLength(50);
  });
});

describe('parseExtraFields', () => {
  it('vacío o ausente es válido y no devuelve nada', () => {
    expect(parseExtraFields(undefined)).toEqual({ fields: {}, valid: true });
    expect(parseExtraFields('')).toEqual({ fields: {}, valid: true });
  });

  it('conserva todas las claves legítimas, incluidas las "reservadas", y su orden', () => {
    const raw = JSON.stringify({
      Nombres: 'JUAN',
      Apellidos: 'PEREZ LOPEZ',
      'Cédula': '0912345678',
      Correo: 'juan@x.com',
      Celular: '0991234567',
      'Dirección': 'Av. 9 de Octubre 123',
    });
    const { fields, valid } = parseExtraFields(raw);
    expect(valid).toBe(true);
    expect(Object.keys(fields)).toEqual(['Nombres', 'Apellidos', 'Cédula', 'Correo', 'Celular', 'Dirección']);
    expect(fields['Dirección']).toBe('Av. 9 de Octubre 123');
  });

  it('descarta JSON inválido y lo que no sea un objeto plano', () => {
    expect(parseExtraFields('{no es json')).toEqual({ fields: {}, valid: false });
    expect(parseExtraFields('[1,2]')).toEqual({ fields: {}, valid: false });
    expect(parseExtraFields('"texto"')).toEqual({ fields: {}, valid: false });
    expect(parseExtraFields('null')).toEqual({ fields: {}, valid: false });
  });

  it('descarta claves peligrosas, objetos, arreglos y null; convierte números', () => {
    const raw = '{"__proto__":{"x":1},"constructor":"c","Obj":{"a":1},"Arr":[1],"Nulo":null,"Num":5,"Ok":"si"}';
    const { fields } = parseExtraFields(raw);
    expect(fields).toEqual({ Num: '5', Ok: 'si' });
    expect(Object.getPrototypeOf(fields)).toBe(Object.prototype);
    expect(({} as any).x).toBeUndefined();
  });

  it('limpia saltos de línea en claves y valores', () => {
    const { fields } = parseExtraFields('{"A\\nB":"uno\\ndos"}');
    expect(fields).toEqual({ 'A B': 'uno dos' });
  });

  it('limita la cantidad de claves', () => {
    const many: Record<string, string> = {};
    for (let i = 0; i < 1000; i++) many[`k${i}`] = 'v';
    expect(Object.keys(parseExtraFields(JSON.stringify(many)).fields)).toHaveLength(EXTRA_FIELDS_MAX_KEYS);
  });
});

describe('toClientDocPrefix', () => {
  it('replica la regla del formulario web', () => {
    expect(toClientDocPrefix('Cédula')).toBe('Cédula');
    expect(toClientDocPrefix('Cédula/Pasaporte (copia)')).toBe('CédulaPasaporte copia');
    expect(toClientDocPrefix('  Título 3.er nivel ')).toBe('Título 3er nivel');
  });
});

describe('describeError', () => {
  it('no vuelca el objeto completo', () => {
    const err: any = new Error('falló');
    err.code = 403;
    err.config = { headers: { Authorization: 'Bearer secreto' } };
    const text = describeError(err);
    expect(text).toBe('falló (código 403)');
    expect(text).not.toContain('secreto');
  });
});
