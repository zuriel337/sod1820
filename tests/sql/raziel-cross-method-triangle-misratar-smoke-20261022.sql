-- #1142 Raziel cross-method research — READ ONLY, bounded corpus, no identities.
-- Uses existing canonical PostgreSQL calculator triangle_word_calc and existing verified misratar field.
-- Note: this is a math equality test, NOT proof of a meaningful relationship.
WITH sample AS MATERIALIZED (
 SELECT phrase,misratar,public.triangle_word_calc(phrase) triangular
 FROM public.gematria_words
 WHERE is_published=true AND is_verified=true
   AND coalesce(is_encrypted,false)=false
   AND phrase IS NOT NULL AND length(phrase) BETWEEN 2 AND 35
 ORDER BY ragil,phrase LIMIT 100
)
SELECT x.phrase AS triangle_phrase,x.triangular AS triangle_value,
       y.phrase AS concealed_phrase,y.misratar AS concealed_value
FROM sample x JOIN sample y ON x.triangular=y.misratar
WHERE x.phrase <> y.phrase
ORDER BY x.triangular,x.phrase,y.phrase LIMIT 40;

-- Must validate query role, publication status and privacy before exposing to Raziel.
-- A public corpus snippet must carry source ID, method, numeric calculation, verified status,
-- and label interpretation separately from arithmetic fact.
