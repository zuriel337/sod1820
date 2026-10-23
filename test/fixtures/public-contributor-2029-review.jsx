import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route} from 'react-router-dom';
import PublicContributor2029Page, {PublicContributor2029View} from '../../src/pages/PublicContributor2029Page.jsx';
import {sourceCatalogFixtureView} from '../../src/components/contributor2029/publicSourceCatalog2029Fixtures.js';
import {fixtureView} from '../../src/components/contributor2029/publicContributor2029Fixtures.js';
import {use2029Palette} from '../../src/lib/palette.js';
import {TYPEFACE,TYPE_SCALE_V2} from '../../src/lib/designTokens.js';
import {setThemePreset} from '../../src/lib/themeMode.js';
const params=new URLSearchParams(location.search);
setThemePreset(params.get('theme')||'dark');
if(params.get('scenario')?.startsWith('loader'))history.replaceState(null,'',('/community/researcher/'+(params.get('scenario')==='loader-tzvi'?'tzvi-opoc':'2042'))+location.search);
function Review(){const P=use2029Palette();const scenario=params.get('scenario');
const view=scenario==='catalog'?sourceCatalogFixtureView():fixtureView({research:scenario==='unavailable'?'unavailable':'ok',empty:scenario==='empty'});
if(scenario==='long') {view.profile.name='כותרת ארוכה במיוחד של כותב וחוקר שמחבר בין מקורות, מאמרים, מספרים וספרים ושומר על ההקשר המדויק בכל שלב';view.profile.bio='';view.items[0].title='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(12);}
const vars={background:P.pageBg,minHeight:'100vh','--s29-font-ui':TYPEFACE.ui,'--s29-font-body':TYPEFACE.body,'--s29-font-numeric':TYPEFACE.numeric};
for(const [key,value] of Object.entries(TYPE_SCALE_V2))vars['--s29-type-'+key]=value.fontSize+'px';
return <main style={vars}><PublicContributor2029View view={scenario==='unknown'?null:view} loading={scenario==='loading'} error={scenario==='error'} onRetry={()=>{}}/></main>}
createRoot(document.getElementById('root')).render(<BrowserRouter>{params.get('scenario')?.startsWith('loader')?<Routes><Route path='/community/researcher/:slug' element={<PublicContributor2029Page/>}/></Routes>:<Review/>}</BrowserRouter>);
