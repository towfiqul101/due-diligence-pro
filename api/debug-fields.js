module.exports = async (req, res) => {
  const locationId = req.query.loc || 'q9VHwhujUYrTkiqenfhm';
  const contactId = req.query.contactId;

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: tenant } = await supabase
      .from('dd_tenants')
      .select('ghl_pit')
      .eq('location_id', locationId)
      .single();

    const pit = tenant && tenant.ghl_pit;
    if (!pit) return res.json({ error: 'No PIT found' });

    // Get all custom fields for this location
    const fieldsRes = await fetch(
      'https://services.leadconnectorhq.com/locations/' + locationId + '/customFields',
      {
        headers: {
          'Authorization': 'Bearer ' + pit,
          'Version': '2021-07-28'
        }
      }
    );
    const fieldsData = await fieldsRes.json();

    // Filter TI- fields only
    const tiFields = (fieldsData.customFields || [])
      .filter(function(f) {
        return (f.fieldKey && (
          f.fieldKey.toLowerCase().includes('ti_') ||
          f.fieldKey.toLowerCase().includes('ti-')
        )) || (f.name && (
          f.name.startsWith('TI -') ||
          f.name.startsWith('TI-') ||
          f.name.startsWith('ti_') ||
          f.name.toLowerCase().startsWith('taxintake')
        ));
      })
      .map(function(f) {
        return { id: f.id, name: f.name, fieldKey: f.fieldKey };
      });

    // All fields for pattern inspection
    const allFields = (fieldsData.customFields || [])
      .map(function(f) { return { name: f.name, fieldKey: f.fieldKey }; });

    // If contactId provided, fetch the contact and resolve field IDs → keys
    var contactFields = null;
    var contactFieldsResolved = null;
    if (contactId) {
      const contactRes = await fetch(
        'https://services.leadconnectorhq.com/contacts/' + contactId,
        {
          headers: {
            'Authorization': 'Bearer ' + pit,
            'Version': '2021-07-28'
          }
        }
      );
      const contactData = await contactRes.json();
      const rawCF = (contactData.contact || contactData).customFields || [];
      contactFields = rawCF;

      // Build id→key map and resolve
      const idToKey = {};
      (fieldsData.customFields || []).forEach(function(f) {
        var key = f.fieldKey || '';
        if (key.startsWith('contact.')) key = key.substring(8);
        if (key && f.id) idToKey[f.id] = key;
      });
      contactFieldsResolved = rawCF
        .filter(function(cf) { return cf.value !== null && cf.value !== undefined && cf.value !== ''; })
        .map(function(cf) {
          return { id: cf.id, key: idToKey[cf.id] || '(unknown)', value: cf.value };
        });
    }

    res.json({
      total_fields: (fieldsData.customFields || []).length,
      ti_fields_found: tiFields.length,
      ti_fields: tiFields,
      contact_custom_fields_raw: contactFields,
      contact_custom_fields_resolved: contactFieldsResolved,
      sample_all_fields: allFields.slice(0, 30)
    });
  } catch(e) {
    res.json({ error: e.message });
  }
};
