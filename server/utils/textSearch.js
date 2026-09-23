/* MongoDB full-text search on a model with a text index, best match
   first. A blank query returns no results rather than everything. */
export async function textSearch(Model, query) {
  const q = String(query ?? "").trim();

  if (!q) return [];

  return Model.find(
    { $text: { $search: q } },
    { score: { $meta: "textScore" } },
  ).sort({ score: { $meta: "textScore" } });
}
