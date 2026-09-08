import {timingSafeEqual} from 'node:crypto';

// Private read-only diagnostics. Never create a contact, note, opportunity or message.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ready:false});
  const token = process.env.GHL_PIT_TOKEN;
  const expected = Buffer.from('Bearer ' + (token || ''));
  const supplied = Buffer.from(String(req.headers.authorization || ''));
  if (!token || supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
    return res.status(401).json({ready:false});
  const location = process.env.GHL_LOCATION_ID;
  if (!location) return res.status(503).json({ready:false,configuration:false});
  try {
    const headers = {Authorization:'Bearer '+token,Version:'2021-07-28'};
    const responses = await Promise.all([
      fetch('https://services.leadconnectorhq.com/locations/'+encodeURIComponent(location)+'/customFields',{headers,signal:AbortSignal.timeout(5000)}),
      fetch('https://services.leadconnectorhq.com/opportunities/pipelines?locationId='+encodeURIComponent(location),{headers,signal:AbortSignal.timeout(5000)})
    ]);
    if (responses.some(response=>!response.ok)) return res.status(503).json({ready:false,crmAccess:false});
    const [fields,pipelines] = await Promise.all(responses.map(response=>response.json()));
    const expectedIds = ['r6O9RljxSBj3PxPsGOOg','cNtoGEjf2oz1CWlWhfwd','mxlSVlzipI3wNOsO7chr','xizi5rIxdIKFPXWqyMXP',
      'py6Sul9d28adXmi14cRG','aPv418oAledts2cZnXAM','cM2Py4uUu9Uj4xmrH52v','jZoh9X0cpNSNUsMF8VXX',
      'Qswaspdjn6udsjWt9BH0','7JCtrvNYDbk3X913DCmV','t12BUfifRAcaCk7Uu3un','SQIBXEy9SywARPO9sc1H',
      'NSEhuUlLoLKGGOkMFDrQ','TZwSC1LGvvvtU0lvwFV0','duNS5CcJSjVC1XBZtqTg','eQmHfW9Q3KSCnXs8lAMh',
      'guAHS0G9UYjncLlqmYM2','21b3V3mbc2OjHfXJkeHh'];
    const fieldsReady = expectedIds.every(id=>(fields.customFields||[]).some(field=>field.id===id&&field.model==='contact'));
    const pipelineReady = (pipelines.pipelines||[]).some(pipeline=>(pipeline.stages||[]).some(stage=>stage.name.toLowerCase()==='lead generation'));
    return res.status(fieldsReady&&pipelineReady?200:503).json({ready:fieldsReady&&pipelineReady,crmAccess:true,
      attributionFields:fieldsReady,leadPipeline:pipelineReady,readOnly:true,checkedAt:new Date().toISOString()});
  } catch (error) { return res.status(503).json({ready:false,crmAccess:false}); }
}
