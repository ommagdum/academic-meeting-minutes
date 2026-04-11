-- Function to update search vector
CREATE OR REPLACE FUNCTION update_meeting_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.agenda_text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on insert or update
DROP TRIGGER IF EXISTS meetings_search_vector_update ON meetings;
CREATE TRIGGER meetings_search_vector_update
    BEFORE INSERT OR UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_meeting_search_vector();

-- Backfill existing rows
UPDATE meetings SET title = title;