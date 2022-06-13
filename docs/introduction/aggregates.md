---
title: "Aggregates"
sidebar_position: 4
---

Exposing huge datasets to BI tools is often either expensive or slow (or both). Aggregates speed up your BI and other data tools by creating roll-up models inside your dbt project from your dbt `sources`, `models`, and `seeds`. 

Metriql creates roll-up models programmatically when you define `aggregates` in your dbt resource files. The roll-up tables are not exposed to end-users. Instead, Metriql re-writes your queries if the users run `segmentation` queries to use the roll-up tables. They're handy for the following cases:

1. Dealing with time-series data and looking for a way to access non-technical people to analyze the data. (i.e. customer event data)
2. Building consumer-facing applications that need to run queries in low latency. (i.e. embedded analytics)
3. If you don't want to spend time writing basic roll-up models in your dbt project.

In order to make use of aggregates, you can use `aggregates`  property under `source | model | seed.meta.metriql`. Here is an example:

```yml
sources:
  - name: events
    tables:
      - name: pageview
        meta:
          - metriql:
              mappings:
                - event_timestamp: occurred_at
              aggregates:
                - event_counts:
                    measures: [total_events, total_users]
                    dimensions: ["occurred_at::day"]
                    filters:
                       - {dimension: platform, operator: equals, value: Android}
        columns:
          - name: platform
          - name: occurred_at
            meta:
              metriql.dimension:
                type: timestamp
          - name: user_id
            meta:
              metriql.measure:
                name: unique_users
                aggregation: approximate_unique
```

When you create the model above for Snowflake adapter, Metriql will create a dbt model called `source_events_pageview_event_counts` with the following SQL:

```sql
{{ config(materialized='incremental') }}

SELECT 
  timestamp_trunc('day', occurred_at) as occurred_at_day, 
  count(*) as total_events, 
  [HLL_ACCUMULATE](https://docs.snowflake.com/en/sql-reference/functions/hll_accumulate.html)(user_id) as unique_users
FROM pageview
WHERE platform = 'Android'
GROUP BY 1

{% if is_incremental() %}
   AND occurred_at > (select max(occurred_at) from {{ this }})
{% endif %}
```

Metriql automatically creates an `incremental` model because you have `event_timestamp` mapping as it's aware that the dataset represents a time-series data. If you don't have the `event_timestamp` mapping, we use `table` materialization. 

:::info
If your model has an `event_timestamp` mapping, we require the dimension to be included in the `aggregate.dimensions` in order to be able to use in our `segmentation` reports because we require a date filter in the user interface.
:::

Lets say that you run a segmentation query below:

```yml
dataset: pageview
measures: [total_events, unique_users]
dimensions: ["occurred_at::week"]
filters: 
   - {dimension: occurred_at, operator: between, value: '2 month'}
   - {dimension: platform, operator: equals, value: Android}
```

Metriql figures out that this data is available in `source_events_pageview_event_counts` model and makes use of this aggregated table instead of the `pageview` table by re-writing the SQL query as follows:

```sql
SELECT date_trunc('week', occurred_at_day), 
       sum(total_events), 
       cardinality([HLL_COMBINE](https://docs.snowflake.com/en/sql-reference/functions/hll_combine.html)(unique_users))
FROM metriql_aggregates.source_events_pageview_event_counts
WHERE platform = 'Android' and 
  occurred_at >= DATEADD(WEEK, -2, to_date(date_trunc('month', CURRENT_TIMESTAMP))) AND 
  occurred_at < DATEADD(DAY, 1, to_date(date_trunc('month', CURRENT_TIMESTAMP)))
GROUP BY 1
```

If you wouldn't have `event_counts` aggregate or run the dbt models, Metriql runs the following query:

```sql
SELECT date_trunc('week', occurred_at), 
       count(*) as total_events,
       [APPROX_COUNT_DISTINCT](https://docs.snowflake.com/en/sql-reference/functions/approx_count_distinct.html)(user_id)
FROM pageview
WHERE platform = 'Android' and 
  occurred_at >= DATEADD(WEEK, -2, to_date(date_trunc('month', CURRENT_TIMESTAMP))) AND 
  occurred_at < DATEADD(DAY, 1, to_date(date_trunc('month', CURRENT_TIMESTAMP)))
GROUP BY 1
```

It can speed up the reports dramatically based on the number of rows in the `events` table because  `source_events_pageview_event_counts` model has only a few thousand rows whereas `events` table potentially has billions of rows.

---

If the dbt model table doesn't exist, Metriql prepends the following comment to the generated query and runs the query on raw data.

```sql
/*
  Unable to use materialize source_events_pageview_event_counts: The target table metriql_aggregates.source_events_pageview_event_counts doesn't exist
*/
```

:::info
`aggregation` field is required for measures that you use in Aggregates.
:::