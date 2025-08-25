# Database Standards

## Core Principles
**autoincrement**: primary key autoincrement `id` in every tables
**foreign key**: Every relationship do not have a foreign key constraint. the name of the foreign key is the name of the related table with an `_ID` suffix.
**boolean**: use 0/1 instead of true/false
**no nullable**: do not use null, instead use empty string
**timestamp**: use `created_at` and `updated_at` in every tables
**no soft delete**: do not use `deleted_at`
**unique**: use `unique`
**index**: use `index`
**enum**: use `enum`
**no json column**: do not use `json` column, use string instead
**no uuid**: do not use `uuid`
**comment**: use comment in every tables and in every columns
**no foreign key cascade**: do not use `on delete cascade`
**no foreign key set null**: do not use `on delete set null`
**no foreign key restrict**: do not use `on delete restrict`
**no foreign key set default**: do not use `on delete set default`
**no foreign key no action**: do not use `on delete no action`
**no foreign key set default**: do not use `on update set default`
**no foreign key restrict**: do not use `on update restrict`
**no foreign key set null**: do not use `on update set null`
**no foreign key cascade**: do not use `on update cascade`
**Performance First**: Every query must be optimized
**No N+1**: Use eager loading or batch queries
**Indexing Strategy**: Covered indexes for hot paths and index in every columns present in where, JOIN, order by, group by, and having clauses 
**Pagination**: Keyset > OFFSET for large datasets
**Connection Pooling**: Reuse connections efficiently

## Query Optimization

Alcune best practices da ricordarsi per le query:

1) definire sempre i campi nella select
   in modo da limitare la memoria utilizzata (se si omette prende tutti i campi select *), soprattutto quando si lavora su tabelle con molti campi.

2) N+1 PROBLEM
   campi select nelle relations ->with()
   definire sempre per tabelle con tanti campi nelle ->with anche le select con i campi necessari (se si omette prende tutti i campi select *)

Missing whenLoased in resources

3) Memoria e memory limit:
   Utilizzare il metodo di estrazione dei dati migliore a seconda della quantità di dati da elaborare per limitare la memoria e/o evitare memory limit
   Alcuni link utili con spiegazioni e tutorial:
   https://janostlund.com/2021-12-26/eloquent-cursor-vs-chunk
   https://blackdeerdev.com/laravel-chunk-vs-cursor/
   https://omarbarbosa.com/posts/optimization-of-eloquent-queries-to-reduce-memory-usage
   https://dudi.dev/optimize-laravel-database-queries/
   eloquent ->lazy()
   lazy collection

4) paginazione senza offset keyset/seek pattern (implementato da laravel con cursor paginate per infinity scroll o next/prev only o Deferred Join, o per batch cron con chunkById dove posso avere tante pagine ma le devo solo scorrere in avanti non andare ad una pagina secca):
   La paginazione con offset ha questo problema soprattutto per le pagine piu' lontane:
   There is a major drawback though, and it lurks in the way that databases handle offsets. Offset tells the database to discard the first N results that are returned from a query. The database still has to fetch those rows from disk though.
   This doesn't matter much if you're discarding 100 rows, but if you're discarding 100,000 rows the database is doing a lot of work just to throw away the results.
   Con LIMIT/OFFSET, a pagina 48.000 MySQL deve comunque “saltare” 48.000 righe e spesso crea/grandisce temporary tables e fa filesort.
   La soluzione solida è passare a keyset/seek pagination
   (id > last_id o (updated_at,id) > (…)),
   usare gli strumenti Laravel che non usano OFFSET, e sistemare gli indici per coprire WHERE/ORDER BY.
   Con keyset/seek + indici in genere spariscono i filesort lunghi e le temp tables enormi.
   cursorPaginate() https://laravel.com/docs/9.x/pagination#cursor-pagination instead of fetching all the records in order and discarding the first N, it fetches only the records after the last position N. Ottimale per infinity scroll, ha il limite che può solo fornire la pagina precedente e la successiva ma non saltare ad una determinata pagina.
   Articoli:
   https://ramzialqrainy.medium.com/faster-pagination-in-mysql-you-are-probably-doing-it-wrong-d9c9202bbfd8
   e anche https://betterprogramming.pub/you-are-doing-sql-pagination-wrong-739a700acbd0
   Usare DEFFERRED JOIN (Offset / Limit with Deferred Joins)
   Qui esempio di macro laravel Usando DEFERRED JOIN (fatta però con 2 query) ->fastPaginate():
   chunkById(): anche per batch o chunk soprattutto nei cron backend dove non serve andare a agina X diretti ma solo scorrerle per elaborarle tutte.

5) Use Exists instead of Sub Query/WhereIn:
   If sometimes need to use subquery at that time first use Exist() function of the SQL server only when the subquery returns large data. In this case, Exist() function works faster than In because Exist() function returns a boolean value based on the query.
   Example:
   Bad Practice:
   SELECT Id, Name FROM Employee WHERE DeptId In (SELECT Id FROM Department WHERE Name like '%Management%')
   Good Practice:
   SELECT Id, Name
   FROM Employee
   WHERE DeptId Exist (SELECT Id
   FROM Department
   WHERE Name like '%Management%')

6) Use EXISTS() Instead of COUNT()
   Using EXISTS keyword to perform an existence check is almost always faster than using COUNT(*).
   EXISTS can stop as soon as the logical test proves true, but COUNT(*) must count every row, even after it knows one row has passed the test.
   Here is a simple benchmark https://mattsuyolo.medium.com/choose-exists-rather-than-count-61476b702919 from Mattsuyolo for this two keywords.

7) Avoid using SELECT DISTINCT
   This clause is very costly when it comes to performance since it has to go through all the dataset to make sure there are not duplicated. It scans the dataset row by row to remove a duplicate when one is found.
   This process increases CPU and memory usage amongst other things.
   For a more detailed explanation, I encourage you read this detailed article https://jmarquesdatabeyond.medium.com/sql-like-a-pro-please-stop-using-distinct-31bdb6481256 from Joao Marques @ Data Beyond Ltd  about DISTINCT clause.

8) INDICI SUL DATABASE:
   devono esserci gli indici per tutti i campi coinvolti in join, where, order by, groupby, having

NON USARE FUNCTION SU COLONNE NELLA WHERE:
if you use a function on a column in a WHERE clause, you can't use an index on that function anymore. By saying YEAR(created_at), we've lost the ability to use an index on the created_at column. Use BETWEN instead.

MULTI-COLUMN INDEXES:
l'ordine delle colonne in un indice è importante
l'indice in mysql (composite index) sono coperti a partire da sinistra verso destra a coprire le colonne interessate nella select come ne trova una colonna non coperta dall'indice scarta l'indice oppure scarta l'indice se trova una range condition.
se c'è una WHERE con equagliaza spesso mysql parte a coprire questa colonna che deve quindi trovarsi per prima in un indice multi colonna, se where ha piu' eguaglianze metterle tutte in file per prime.
le colonne nell'orderby sono sempre coperte per ultime insieme a quelle del group by, quindi devono trovarsi infondo all'indice immediatamente dopo le colonne dei criteri di where. Eventualmente possono seguire dopo altre colonne per coprire tutte le colonne estratte nella select (vedi covered index)
If a multiple-column index exists on col1 and col2, the appropriate rows can be fetched directly. If separate single-column indexes exist on col1 and col2, the optimizer attempts to use the Index Merge optimization (see Section 8.2.1.3, “Index Merge Optimization”), or attempts to find the most restrictive index by deciding which index excludes more rows and using that index to fetch the rows.
If the table has a multiple-column index, any leftmost prefix of the index can be used by the optimizer to look up rows. For example, if you have a three-column index on (col1, col2, col3), you have indexed search capabilities on (col1), (col1, col2), and (col1, col2, col3).
REGOLA DELLE TRE STELLE per creare indici:
1 STELLA: prima le colonne che sono coinvolte nelle uguaglianze dentro where congiunte con AND
NOTA: Se ce Disjunction where con OR o ha espressioni complesse non si può applicare la prima stella.
2 STELLA: poi colonne coinvolte in order by e group by (eventualmente con descending index in base all'order by)
NOTA; non puoi raggiungere la seconda stella quando
3 STELLA: coprire in ordine le colonne estratte nella select

Ref: https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html
Ref.: https://www.slideshare.net/billkarwin/how-to-design-indexes-really

COVERED INDEX:
A covering index is an index where all required fields for the query are contained in the index itself. When all parts of a query can be "covered" by an index, the database does not have to read the row at all, it can get everything it needs from the index.
Note that covering indexes aren't created in any special way. It only refers to the situation where a single index satisfies everything required by a query.
Def. from mysql.com: An index that includes all the columns retrieved by a query. Instead of using the index values as pointers to find the full table rows, the query returns values from the index structure, saving disk I/O. InnoDB can apply this optimization technique to more indexes than MyISAM can, because InnoDB secondary indexes also include the primary key columns. InnoDB cannot apply this technique for queries against tables modified by a transaction, until that transaction ends. https://dev.mysql.com/doc/refman/8.0/en/glossary.html#glos_covering_index

Quindi Se si riesce a far usare un coverd index al mysql questo riduce le letture su disco (read I/O) e ritorna direttamente il record con l'indice anzichè dall'indice andare poi a prendersi gli altri campi.
ESEMPI:
select id, name from table where id = 1

    INDEX(id, name)       -- covering; best index
    INDEX(id, name, age)  -- covering, but overkill
    INDEX(age, name, id)  -- covering, but inefficient (might not be used)

select id, name, age from table where id = 1

    INDEX(id, name, age) -- Having `id` first is optimal, but any order is "covering"

INNODB INDEX includono sempre la Primary Key (id):
As already pointed out, if this is InnoDB and the table has PRIMARY KEY(id), then none of these secondary indexes are worth having.
InnoDB secondary indexes also include the primary key columns. InnoDB cannot apply this technique for queries against tables modified by a transaction, until that transaction ends.

Es.: in innodb index (email) è identico all'indice (email, id)

GROUP BY and Different ORDER BY
SELECT a FROM tbl GROUP BY b ORDER BY c

    No index is very useful since the GROUP BY and ORDER BY are not the same.

    INDEX(a,b,c)   -- in any order, is "covering"
    INDEX(b,c,a)   -- "covering", and perhaps optimal.
    INDEX(b,c,a,d) -- "covering", but 'bigger'
Bigger matters in small ways.

When doing SELECT COUNT(*) FROM ..., InnoDB will (usually) pick the 'smallest' index to do the counting.

Another 'rule' is to avoid redundant indexes.

    INDEX(a,b)  -- Let's say you 'need' this one.
    INDEX(a)    -- Then this one is redundant and should be dropped.

DESCENDING INDEX ():

CLUSTERED INDEX (DATA PRUNING):
Data pruning using clustered indexes
Data pruning is the technique that’s used by the query engine to make sure that the query is scanning only the rows that match the condition provided by the WHERE clause.
Clustered indexes are indexes that the order of the rows in the data corresponds to the order of rows in the index. It provides a linear access to the data. An example of a clustered index is PRIMARY INDEX which can be composed by one or more columns.
A more detailed explanation can be found on Indexes in Action blog post by
Octavian Zarzu in Firebolt blog.


LATE ROW LOOKUPS:
MySQL ORDER BY / LIMIT performance: late row lookups https://explainextended.com/2009/10/23/mysql-order-by-limit-performance-late-row-lookups/

HASHED BASED CALCULATED COLUMN:
As an alternative to a composite index, you can introduce a column that is “hashed” based on information from other columns. If this column is short, reasonably unique, and indexed, it might be faster than a “wide” index on many columns. In MySQL, it is very easy to use this extra column:
ESEMPIO:
SELECT * FROM tbl_name
WHERE hash_col=MD5(CONCAT(val1,val2))
AND col1=val1 AND col2=val2;

In questi casi va piu' forte la query ma il drowback su mysql è che non


9) CACHE:
   usare cahce con le query (->withCache() sui builder) pensado alla logica di svuotamento: se semplice con ttl, altrimenti con tag (attenzione ai tag con redis eloquent per ogni tag crea poi + hit su redis quando va a riprendere una chiave).

10) OTTIMIZARE JOIN
    partire a fare i join dalla tabella presente nella where (mysql predilige spesso partire da li) o con meno record e via via quelle con piu' record questo se svolta con num record la pesantezza, se è indifferente allora partire sempre dalla tabella per la quale devo tirarmi fuori il model.

11) Use JSON/ARRAY columns and LAMBDA
    With this technique we try to minimise the number of tables and as a consequence, also the number of JOINs, by having only one table with ARRAY or JSON columns containing our data in a structured way.

For example, we have a products table for and a product price table where we keep track of the product prices for each day. As we can imagine, this tables will increase in size a lot.

What we can do in this case is to have only one table for products where we have two columns as arrays, one one we store the dates and on the other one the prices where the index of the dates matched with the index of the prices.

                                                Merged Table Outcome

In this case, to sort the product prices ascending based on the date we use a SQL Lambda function called ARRAY_SORT

The same approach is used for JSON columns where the data is stored as a key value pair JSON object.

To have a better understanding of Lambdas in SQL I encourage to read SQL: Thinking in Lambdas https://www.firebolt.io/blog/sql-thinking-in-lambdas blog post by  Octavian Zarzu  in Firebolt blog as well as watching the following video  https://youtu.be/FfCaS0gmTOc Matan Sarig, a Solution Architect Team Lead at Firebolt.


12) Table Partitioning/Reduce Table Size
    This is another really important technique which consists on splitting up a database table in multiple pieces called partitions and then we can query each partition separately.

Our queries will become more performant since we’ll be queries a smaller part of the full table which has less records.

For this, you can read my SQL Caching and Table Partitioning article https://albionbame.medium.com/mysql-caching-and-table-partitioning-c65d7010216e .


## Anti-Patterns to Avoid
- ❌ SELECT * (specify columns)
- ❌ OFFSET for pagination > 1000 rows
- ❌ Functions in WHERE clause
- ❌ Missing indexes on foreign keys
- ❌ Not using prepared statements
- ❌ Long-running transactions

## Quality Gates
- Max query time: 1 second
- Max OFFSET: 1000 rows
- Required: Indexes on all foreign keys
- Required: Connection pooling
- Blocked: Functions in WHERE clause
