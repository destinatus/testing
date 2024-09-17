DECLARE
  CURSOR c_data IS
    SELECT column1, column2, column3
    FROM source_table
    WHERE some_condition;
  
  TYPE t_data_array IS TABLE OF c_data%ROWTYPE;
  l_data t_data_array;

BEGIN
  OPEN c_data;
  
  LOOP
    FETCH c_data BULK COLLECT INTO l_data LIMIT 50;
    
    EXIT WHEN l_data.COUNT = 0;
    
    FORALL i IN 1..l_data.COUNT
      MERGE INTO target_table t
      USING (SELECT l_data(i).column1 as col1,
                    l_data(i).column2 as col2,
                    l_data(i).column3 as col3
             FROM dual) s
      ON (t.key_column = s.col1)
      WHEN MATCHED THEN
        UPDATE SET t.column2 = s.col2,
                   t.column3 = s.col3
      WHEN NOT MATCHED THEN
        INSERT (t.column1, t.column2, t.column3)
        VALUES (s.col1, s.col2, s.col3);
    
    COMMIT;
  END LOOP;
  
  CLOSE c_data;
END;
