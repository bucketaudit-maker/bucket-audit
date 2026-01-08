const INDEX = "buckets_v1";

export async function ensureOpenSearch() {
  const base = process.env.OPENSEARCH_URL;
  if (!base) throw new Error("OPENSEARCH_URL is not set");

  const head = await fetch(`${base}/${INDEX}`, { method: "HEAD" });
  if (head.status === 200) return;

  const mapping = {
    mappings: {
      properties: {
        orgId: { type: "keyword" },
        bucketId: { type: "keyword" },
        accountId: { type: "keyword" },
        name: { type: "text", fields: { raw: { type: "keyword" } } },
        region: { type: "keyword" },
        isPublic: { type: "boolean" },
        severity: { type: "keyword" },
        findingTypes: { type: "keyword" },
        lastSeenAt: { type: "date" }
      }
    }
  };

  const r = await fetch(`${base}/${INDEX}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mapping)
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Failed to create index: ${r.status} ${t}`);
  }
}

export async function searchBuckets(orgId: string, q: string) {
  const base = process.env.OPENSEARCH_URL!;
  const body = {
    size: 50,
    query: q
      ? { bool: { filter: [{ term: { orgId } }], must: [{ query_string: { query: q } }] } }
      : { term: { orgId } },
    sort: [{ lastSeenAt: "desc" }]
  };

  const r = await fetch(`${base}/${INDEX}/_search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenSearch query failed: ${r.status} ${t}`);
  }

  const j: any = await r.json();
  return (j.hits?.hits || []).map((h: any) => h._source);
}
