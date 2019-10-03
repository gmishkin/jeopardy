export default function() {
    return context.services.get("mongodb-atlas").db("jeopardy");
}
