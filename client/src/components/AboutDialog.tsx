import { X } from "lucide-react";

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-background border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold">About Etymoscope</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-secondary transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              Etymoscope is an interactive visualization tool for exploring the etymological 
              relationships between words. Two words have a link between them if and only if one of the 
              words is present in the "Related Words" section of the other word's page on  
              <a href="https://etymonline.com/"> <u>The Online Etymology Dictionary</u></a>.
            </p>

            {/* <div>
              <h3 className="font-semibold mb-2">How to Use</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Search for any word to visualize its etymological connections</li>
                <li>Click on nodes in the graph to see their etymologies</li>
                <li>Use the Random button to discover interesting words</li>
              </ul>
            </div> */}

            {/* <div>
              <h4 className="font-semibold mb-2">Usage</h4>
              <p className="text-muted-foreground">
                Intuitive.
              </p>
            </div> */}

            <div>
              {/* <h3 className="font-semibold mb-2">Origins</h3> */}
              {/* <h4 className="font-semibold mb-2">Origins</h4> */}
              <p className="text-muted-foreground">
                This iteration of the project was developed with <a href="https://kiro.dev/about/"><u>Kiro</u></a>, 
                an agentic AI. I have misgivings about using AI for this purpose&mdash;<a href="https://archive.nytimes.com/www.nytimes.com/books/97/05/18/reviews/pynchon-luddite.html"><u>it <i>is</i> okay to be a Luddite</u></a>&mdash;but
                 the app's functionality, appearance, and usability would all suffer direly without it.{" "}
                <a href="/legacy.html"><u>The previous iteration</u></a>, developed in 2018, attests to this fact.
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                The project's source code can be found on <a href="https://github.com/tetraptych/etymoscope"><u>GitHub</u></a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
