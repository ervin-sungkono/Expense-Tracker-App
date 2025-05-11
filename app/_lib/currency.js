import '@formatjs/intl-enumerator/polyfill';

export function getSupportedCurrencies() {
    return Intl.supportedValuesOf('currency');
}