/** YAQL built-in functions: signature + documentation */
export const yaqlFunctionDocs: Record<
  string,
  { signature: string; documentation: string }
> = {
  map: {
    signature: "map(list, func)",
    documentation:
      "Applies the `func` function to each element in the list and returns a new list.",
  },
  filter: {
    signature: "filter(list, predicate)",
    documentation:
      "Filters the elements of the list according to the predicate, returning those for which it is true.",
  },
  tasks: {
    signature:
      "tasks(execution_id=null, recursive=false, state=null, flat=false)",
    documentation:
      "Returns tasks matching criteria (execution, status, etc.).",
  },
  executions: {
    signature:
      "executions(id=null, root_execution_id=null, state=null, from_time=null, to_time=null)",
    documentation:
      "Return the executions filtered by id, state or date.",
  },
  task: {
    signature: "task(name)",
    documentation: "Return the task named (or null if absent).",
  },
  execution: {
    signature: "execution()",
    documentation: "Return the current execution details.",
  },
  env: {
    signature: "env()",
    documentation: "Return the execution environment variables.",
  },
  global: {
    signature: "global(name)",
    documentation: "Return the global variable named (or null if absent).",
  },

  // Boolean & type checks
  bool: {
    signature: "bool(value)",
    documentation: 'Converts a value to boolean (0/"" => false).',
  },
  isBoolean: {
    signature: "isBoolean(value)",
    documentation: "Returns true if value is a boolean.",
  },
  isString: {
    signature: "isString(value)",
    documentation: "Returns true if value is a string.",
  },
  isInteger: {
    signature: "isInteger(value)",
    documentation: "Returns true if value is an integer.",
  },
  isNumber: {
    signature: "isNumber(value)",
    documentation: "Returns true if value is numeric.",
  },
  isList: {
    signature: "isList(value)",
    documentation: "Returns true if value is a list.",
  },
  isDict: {
    signature: "isDict(value)",
    documentation: "Returns true if value is a dictionary.",
  },
  isSet: {
    signature: "isSet(value)",
    documentation: "Returns true if value is a set.",
  },
  isDatetime: {
    signature: "isDatetime(value)",
    documentation: "Returns true if value is a datetime object.",
  },
  isTimespan: {
    signature: "isTimespan(value)",
    documentation: "Returns true if value is a timespan object.",
  },
  isRegex: {
    signature: "isRegex(value)",
    documentation: "Returns true if value is a regex object.",
  },

  // Math
  abs: {
    signature: "abs(number)",
    documentation: "Returns the absolute value of the number.",
  },
  float: {
    signature: "float(value)",
    documentation: "Converts number or string to floating-point.",
  },
  int: {
    signature: "int(value)",
    documentation: "Converts value (number/string/null) to integer.",
  },
  max: {
    signature: "max(a, b)",
    documentation: "Returns the maximum of two numbers.",
  },
  min: {
    signature: "min(a, b)",
    documentation: "Returns the minimum of two numbers.",
  },
  bitwiseAnd: {
    signature: "bitwiseAnd(x, y)",
    documentation: "Returns bitwise AND of two integers.",
  },
  bitwiseOr: {
    signature: "bitwiseOr(x, y)",
    documentation: "Returns bitwise OR of two integers.",
  },
  bitwiseXor: {
    signature: "bitwiseXor(x, y)",
    documentation: "Returns bitwise XOR of two integers.",
  },
  bitwiseNot: {
    signature: "bitwiseNot(x)",
    documentation: "Returns bitwise NOT of the integer.",
  },

  // Collections & sequences
  add: {
    signature: "add(set, ...values)",
    documentation: "Adds values to a set, returning new set.",
  },
  contains: {
    signature: "contains(coll, val)",
    documentation: "Returns true if collection contains value.",
  },
  containsKey: {
    signature: "containsKey(dict, key)",
    documentation: "Returns true if dictionary has key.",
  },
  containsValue: {
    signature: "containsValue(dict, val)",
    documentation: "Returns true if dictionary has value.",
  },
  delete: {
    signature: "delete(coll, idx, count=1)",
    documentation: "Removes elements by index and count.",
  },
  deleteAll: {
    signature: "deleteAll(dict, keys)",
    documentation: "Removes given keys from dictionary.",
  },
  dict: {
    signature: "dict(k1=>v1, ...)",
    documentation: "Creates dictionary from key=>value pairs.",
  },
  difference: {
    signature: "difference(s1, s2)",
    documentation: "Returns elements in s1 not in s2.",
  },
  union: {
    signature: "union(s1, s2)",
    documentation: "Returns union of two sets.",
  },
  intersect: {
    signature: "intersect(s1, s2)",
    documentation: "Returns intersection of two sets.",
  },
  flatten: {
    signature: "flatten(coll)",
    documentation: "Flattens nested collections into one list.",
  },
  get: {
    signature: "get(dict, key, default)",
    documentation: "Returns dict[key] or default if missing.",
  },
  insert: {
    signature: "insert(list, idx, val)",
    documentation: "Inserts value into list at index.",
  },
  insertMany: {
    signature: "insertMany(list, idx, vs)",
    documentation: "Inserts multiple values into list.",
  },
  items: {
    signature: "items(dict)",
    documentation: "Returns list of [key,value] pairs.",
  },
  keys: {
    signature: "keys(dict)",
    documentation: "Returns list of dictionary keys.",
  },
  len: {
    signature: "len(coll)",
    documentation: "Returns length of any collection or string.",
  },
  list: {
    signature: "list(v1, v2, ...)",
    documentation: "Creates a list from provided values.",
  },
  sequence: {
    signature: "sequence(start=0, step=1)",
    documentation: "Generates infinite sequence by step.",
  },
  first: {
    signature: "first(coll)",
    documentation: "Returns first element or default if empty.",
  },
  last: {
    signature: "last(coll)",
    documentation: "Returns last element or default if empty.",
  },
  indexOf: {
    signature: "indexOf(coll, val)",
    documentation: "Returns first index of value or -1.",
  },
  indexWhere: {
    signature: "indexWhere(coll, pred)",
    documentation: "Returns first index matching predicate.",
  },
  lastIndexOf: {
    signature: "lastIndexOf(coll, val)",
    documentation: "Returns last index of value or -1.",
  },
  lastIndexWhere: {
    signature: "lastIndexWhere(coll,p)",
    documentation: "Returns last index matching predicate.",
  },
  distinct: {
    signature: "distinct(coll)",
    documentation: "Returns unique elements from collection.",
  },
  reverse: {
    signature: "reverse(coll)",
    documentation: "Returns elements in reverse order.",
  },
  where: {
    signature: "where(coll, pred)",
    documentation: "Filters collection by predicate.",
  },
  select: {
    signature: "select(coll, fn)",
    documentation: "Applies fn to each element.",
  },
  selectMany: {
    signature: "selectMany(coll, fn)",
    documentation: "Maps and flattens results.",
  },
  join: {
    signature: "join(c1, c2, cond)",
    documentation: "Joins two collections by condition.",
  },
  aggregate: {
    signature: "aggregate(coll, fn)",
    documentation: "Cumulatively aggregates collection elements.",
  },
  sum: { signature: "sum(coll)", documentation: "Sums all numeric elements." },
  skip: {
    signature: "skip(coll, count)",
    documentation: "Skips first count elements.",
  },
  skipWhile: {
    signature: "skipWhile(coll, pred)",
    documentation: "Skips while predicate is true.",
  },
  takeWhile: {
    signature: "takeWhile(coll, pred)",
    documentation: "Takes while predicate is true.",
  },
  slice: {
    signature: "slice(coll, length)",
    documentation: "Splits into sublists of given length.",
  },
  sliceWhere: {
    signature: "sliceWhere(coll, pred)",
    documentation: "Splits when predicate value changes.",
  },
  splitAt: {
    signature: "splitAt(coll, idx)",
    documentation: "Splits into two lists at index.",
  },
  splitWhere: {
    signature: "splitWhere(coll, pred)",
    documentation: "Splits at elements where predicate true.",
  },
  single: {
    signature: "single(coll)",
    documentation: "Returns sole element or throws if multiple.",
  },
  orderBy: {
    signature: "orderBy(coll, sel)",
    documentation: "Sorts ascending by selector.",
  },
  orderByDescending: {
    signature: "orderByDescending(coll,sel)",
    documentation: "Sorts descending by selector.",
  },
  zip: {
    signature: "zip(...colls)",
    documentation: "Groups nth elements into tuples.",
  },
  zipLongest: {
    signature: "zipLongest(...colls)",
    documentation: "Like zip but up to longest collection.",
  },

  // String operations
  characters: {
    signature: "characters(options)",
    documentation: "Returns list of chars per categories.",
  },
  concat: {
    signature: "concat(s1, s2, ...)",
    documentation: "Concatenates all strings into one.",
  },
  endsWith: {
    signature: "endsWith(str, suffix)",
    documentation: "Returns true if string ends with suffix.",
  },
  startsWith: {
    signature: "startsWith(str, prefix)",
    documentation: "Returns true if string starts with prefix.",
  },
  toLower: {
    signature: "toLower(str)",
    documentation: "Converts string to lowercase.",
  },
  toUpper: {
    signature: "toUpper(str)",
    documentation: "Converts string to uppercase.",
  },
  trim: {
    signature: "trim(str)",
    documentation: "Trims whitespace from both ends.",
  },
  trimLeft: {
    signature: "trimLeft(str)",
    documentation: "Trims whitespace from start.",
  },
  trimRight: {
    signature: "trimRight(str)",
    documentation: "Trims whitespace from end.",
  },
  joinStrings: {
    signature: "join(list, separator)",
    documentation: "Joins list with separator into string.",
  },

  // Regular expressions
  regex: {
    signature: "regex(pattern, ignoreCase, multiLine, dotAll)",
    documentation: "Compiles regex object from pattern.",
  },
  escapeRegex: {
    signature: "escapeRegex(str)",
    documentation: "Escapes special regex chars in string.",
  },
  matches: {
    signature: "matches(input, pattern)",
    documentation: "Returns true if input matches pattern.",
  },
  replaceBy: {
    signature: "replaceBy(input, mapping)",
    documentation: "Replaces matches via mapping function.",
  },
  search: {
    signature: "search(regex, string)",
    documentation: "Returns first substring matching regex.",
  },

  // Date & time
  datetime: {
    signature: "datetime(year, month, day, ...)",
    documentation: "Creates or converts to datetime object.",
  },
  format: {
    signature: "format(datetime, formatString)",
    documentation: "Formats datetime with given pattern.",
  },
  now: {
    signature: "now(offset=timespan(0))",
    documentation: "Returns current datetime (with offset).",
  },
  timespan: {
    signature: "timespan(days, hours, ...)",
    documentation: "Creates timespan object from units.",
  },
  localtz: {
    signature: "localtz()",
    documentation: "Returns local timezone offset.",
  },
  utctz: {
    signature: "utctz()",
    documentation: "Returns UTC timezone offset (zero).",
  },

  // Intrinsics
  assert: {
    signature: "assert(obj, cond, msg)",
    documentation: "Returns obj if cond true, else throws error.",
  },
  call: {
    signature: "call(fn, args, kwargs)",
    documentation: "Invokes function with provided args.",
  },
  let: {
    signature: "let(...values)",
    documentation: "Stores and returns values for chaining.",
  },
  switch: {
    signature: "switch(cond1=>v1, ..., default)",
    documentation: "Returns value of first true condition.",
  },
};

/** Mistral workflow keys and descriptions. */
export const mistralKeyDocs: Record<string, string> = {
  // Global workflow keys
  "version": "Mistral DSL version (must be '2.0').",
  "type": "Workflow type: 'direct' or 'reverse'.",
  "description": "Free text description of workflow or task.",
  "input": "Input parameters for workflow or task.",
  "vars": "Initial global variables for the workflow.",
  "output": "Workflow output structure via expressions.",
  "output-on-error": "Workflow output in case of error.",
  "task-defaults": "Default values applied to all tasks.",
  "tasks": "List of tasks in the workflow.",

  // Task attribute keys
  "action": "Name of the action executed by the task.",
  "workflow": "Name of the sub-workflow to call.",
  "publish": "Variables published for subsequent tasks.",
  "publish-on-error": "Variables published only on error.",
  "input_task": "Input arguments for action or sub-workflow.",
  "with-items": "Iterates the task over a collection.",
  "keep-result": "Retains or discards the task result.",
  "target": "Target executor for this task.",
  "pause-before": "Pause before executing the task.",
  "wait-before": "Delay before starting the task (seconds).",
  "wait-after": "Delay after task completion (seconds).",
  "fail-on": "Condition to force task failure.",
  "timeout": "Maximum task runtime duration (seconds).",
  "concurrency": "Maximum parallel executions of the task.",
  "retry": "Retry policy on task failure.",
  "safe-rerun": "Allows safe rerun if executor dies.",

  // Transition and control-flow keys
  "on-success": "Tasks to run on success.",
  "on-error": "Tasks to run on error.",
  "on-complete": "Tasks to run regardless of outcome.",
  "requires": "List of prerequisite tasks (dependencies).",
  "join": "Synchronization condition for parallel branches."
};