import { useQuery } from 'react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getVendors } from '../hooks/api/useVendors';
import ProductionLogTab from '../components/ProductionLogTab';
import RentalLogTab from '../components/RentalLogTab';

export default function VendorDetailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const id = Number(params.get('id'));
  const query = useQuery(['vendor-detail', id], async () => {
    const first = await getVendors({ page: 1, limit: 100 });
    let vendor = first.data.items.find(row => row.id === id);
    for (let page = 2; !vendor && page <= first.data.total_pages; page++) vendor = (await getVendors({ page, limit: 100 })).data.items.find(row => row.id === id);
    return vendor ?? null;
  }, { enabled: id > 0 });
  return <div className="page-content"><Link to={params.get('kind') === 'loan' ? '/loan' : '/vendor'}>← {t('october.vendors')}</Link>{query.isLoading ? <p>{t('wording.loading')}</p> : query.isError ? <p role="alert">{t('october.loadError')}</p> : !query.data ? <p>{t('october.notFound')}</p> : <><h2>{query.data.name}</h2><div className="oct-toolbar"><span>{query.data.origin}</span><span>{query.data.category}</span><span>{query.data.contact}</span></div>{params.get('kind') === 'loan' ? <RentalLogTab vendorId={id} /> : <ProductionLogTab vendorId={id} />}</>}</div>;
}
